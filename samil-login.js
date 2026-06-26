/**
 * samil-login.js — 삼일공업고등학교 취업포털 통합 로그인 모듈
 *
 * 모든 페이지(jobs, practice, stats, index 등)에서 동일한
 * 세션 키와 함수를 사용하도록 통합합니다.
 *
 * 사용법:
 *   <script src="samil-login.js"></script>  (samil-api.js 보다 먼저)
 *   페이지 init() 최상단에 SAMIL_AUTH.restore() 호출
 */

const SAMIL_AUTH = (() => {

  // ── 표준 세션 키 ──────────────────────────────
  const K = {
    ROLE:       'samilRole',              // 'student' | 'teacher' | 'admin'
    ME:         'samilME',               // 통합 ME JSON
    TEACHER:    'samilTeacherAuth',      // 교사 ID (하위호환)
    TEACHER_ME: 'samilTeacherME',        // 교사 ME JSON (하위호환)
    STUDENT:    'samilStudentAuth',      // 학생 학번 (하위호환)
    STUDENT_ME: 'samilStudentME',        // 학생 ME JSON (하위호환)
    ADMIN:      'samilAdminAuth',        // '1' (하위호환)
    STATS_ME:   'statsMe',               // stats.html 하위호환
    NH_AUTH:    'samilNonHomeTeacherAuth',
    NH_ME:      'samilNonHomeTeacherME',
  };

  // ── 내부 헬퍼 ─────────────────────────────────
  function _get(key)       { return sessionStorage.getItem(key); }
  function _set(key, val)  { sessionStorage.setItem(key, val); }
  function _del(key)       { sessionStorage.removeItem(key); }
  function _json(key)      { try { return JSON.parse(_get(key) || 'null'); } catch(_) { return null; } }

  // ── 상태 조회 ──────────────────────────────────
  function getRole()    { return _get(K.ROLE); }

  function isLoggedIn() {
    return !!_get(K.ROLE)
        || _get(K.ADMIN) === '1'
        || !!_get(K.TEACHER)
        || !!_get(K.STUDENT);
  }

  function isAdmin()   { return getRole() === 'admin'   || _get(K.ADMIN) === '1'; }
  function isTeacher() { return getRole() === 'teacher' || !!_get(K.TEACHER); }
  function isStudent() { return getRole() === 'student' || !!_get(K.STUDENT); }

  function getME() {
    const me = _json(K.ME);
    if (me) return me;
    // 하위호환: 새 통합 키 없으면 기존 키에서 복원
    if (_get(K.ADMIN) === '1') return { role: 'admin', name: '관리자' };
    const t = _json(K.TEACHER_ME);
    if (t && _get(K.TEACHER)) return { ...t, role: 'teacher' };
    const s = _json(K.STUDENT_ME);
    if (s && _get(K.STUDENT)) return { ...s, role: 'student' };
    return {};
  }

  function getDisplayName() {
    const me = getME();
    if (!me || !me.role) return '';
    if (me.role === 'admin')   return '관리자';
    if (me.role === 'teacher') return (me.name || '선생님') + '선생님' + (me.isNonHome ? ' (비담임)' : '');
    if (me.role === 'student') return (me.name || '학생') + '님';
    return '';
  }

  // ── 로그인 세션 저장 ───────────────────────────
  function setTeacher(teacher) {
    const me = { ...teacher, role: 'teacher' };
    _set(K.ROLE,       'teacher');
    _set(K.ME,         JSON.stringify(me));
    _set(K.TEACHER,    teacher.id || '1');
    _set(K.TEACHER_ME, JSON.stringify(teacher));
    _set(K.STATS_ME,   JSON.stringify(me));   // stats.html 호환
    return me;
  }

  function setStudent(student) {
    const me = { ...student, role: 'student' };
    _set(K.ROLE,       'student');
    _set(K.ME,         JSON.stringify(me));
    _set(K.STUDENT,    String(student.id));
    _set(K.STUDENT_ME, JSON.stringify(student));
    return me;
  }

  function setAdmin() {
    const me = { role: 'admin', name: '관리자' };
    _set(K.ROLE,     'admin');
    _set(K.ME,       JSON.stringify(me));
    _set(K.ADMIN,    '1');
    _set(K.STATS_ME, JSON.stringify(me));   // stats.html 호환
    return me;
  }

  // ── 로그아웃 ───────────────────────────────────
  function logout() {
    Object.values(K).forEach(k => _del(k));
  }

  // ── 페이지 로드 시 기존 세션 복원 ────────────────
  // 이전 형식(K.ROLE 없이 개별 키만 있는 경우)을 새 형식으로 통일
  function restore() {
    if (_get(K.ROLE)) return true;   // 이미 새 형식

    if (_get(K.ADMIN) === '1') {
      setAdmin();
      return true;
    }
    if (_get(K.TEACHER)) {
      const t = _json(K.TEACHER_ME) || {};
      setTeacher(t);
      return true;
    }
    if (_get(K.STUDENT)) {
      const s = _json(K.STUDENT_ME) || {};
      setStudent(s);
      return true;
    }
    // statsMe 폴백 (stats.html에서 로그인 후 다른 페이지로 왔을 때)
    const sm = _json(K.STATS_ME);
    if (sm && sm.role === 'teacher') { setTeacher(sm); return true; }
    if (sm && sm.role === 'admin')   { setAdmin();      return true; }

    return false;
  }

  // ── 네비게이션 인증 UI 공통 렌더 ─────────────────
  // elId: nav-auth 요소 ID
  // onLogout: 로그아웃 후 콜백
  // onOpen: 로그인 모달 열기 콜백
  function renderNavAuth(elId, onLogout, onOpen) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (isLoggedIn()) {
      const me = getME();
      let href = '#', label = getDisplayName();
      if (me.role === 'admin')   href = 'admin.html';
      if (me.role === 'teacher') href = 'teacher.html';
      if (me.role === 'student') href = 'student.html';
      el.innerHTML =
        `<a href="${href}" class="nav-login" style="background:#38A169!important">${label}</a>` +
        `<a href="#" onclick="(${onLogout.toString()})();return false" style="color:rgba(255,255,255,.7);font-size:13px;padding:7px 10px">로그아웃</a>`;
    } else {
      el.innerHTML =
        `<a href="#" class="nav-login" onclick="(${onOpen.toString()})();return false">로그인</a>`;
    }
  }

  return {
    K,
    getRole, isLoggedIn, isAdmin, isTeacher, isStudent,
    getME, getDisplayName,
    setTeacher, setStudent, setAdmin,
    logout, restore,
    renderNavAuth,
  };
})();
