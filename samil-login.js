/**
 * samil-login.js — 삼일공업고등학교 취업포털 공통 로그인 모듈
 *
 * ▶ 사용법 (각 페이지 </body> 바로 앞):
 *
 *   <script>
 *   window.SAMIL_LOGIN_CONFIG = {
 *     tabs:      ['student','teacher','admin'],  // 보여줄 탭 (기본: 모두)
 *     navAuthId: 'nav-auth',                     // nav 인증 영역 ID (기본: 'nav-auth')
 *     onSuccess: function(role) { ... },         // 로그인 성공 후 콜백 (선택)
 *     onLogout:  function() { ... },             // 로그아웃 후 콜백 (선택)
 *   };
 *   </script>
 *   <script src="samil-api.js"></script>
 *   <script src="samil-login.js"></script>
 *
 * ▶ 전역 함수 (어느 페이지에서나 사용 가능):
 *   openLogin()      — 로그인 모달 열기
 *   closeLogin()     — 로그인 모달 닫기
 *   updateNavAuth()  — nav 인증 영역 갱신
 *   doLogout()       — 로그아웃
 */
(function () {
  'use strict';

  /* ── 설정 ───────────────────────────────────────────── */
  const cfg = Object.assign({
    tabs:      ['student', 'teacher', 'admin'],
    navAuthId: 'nav-auth',
    onSuccess: null,
    onLogout:  null,
  }, window.SAMIL_LOGIN_CONFIG || {});

  const showSt = cfg.tabs.includes('student');
  const showTc = cfg.tabs.includes('teacher');
  const showAd = cfg.tabs.includes('admin');
  const firstTab = showSt ? 'st' : showTc ? 'tc' : 'ad';

  /* ── CSS 주입 ────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
#samilLoginModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);
  z-index:9999;align-items:center;justify-content:center;padding:16px}
#samilLoginModal.open{display:flex}
.sl-box{background:#fff;border-radius:16px;width:100%;max-width:380px;
  box-shadow:0 8px 40px rgba(0,0,0,.22);overflow:hidden;font-family:'Noto Sans KR',sans-serif}
.sl-header{padding:18px 20px 14px;border-bottom:1px solid #DDE3EE;
  display:flex;justify-content:space-between;align-items:center}
.sl-header h3{font-size:17px;font-weight:700;margin:0}
.sl-close{background:none;border:none;font-size:22px;cursor:pointer;color:#5A6A7E;line-height:1}
.sl-body{padding:20px}
.sl-tab{display:flex;gap:4px;margin-bottom:18px;background:#F4F6FA;padding:4px;border-radius:10px}
.sl-tab button{flex:1;padding:8px;border:none;background:none;border-radius:8px;
  font-size:13px;cursor:pointer;color:#5A6A7E;font-family:inherit;transition:.15s}
.sl-tab button.active{background:#fff;color:#1A3A6B;font-weight:700;
  box-shadow:0 1px 4px rgba(0,0,0,.1)}
.sl-fg{margin-bottom:13px}
.sl-fg label{display:block;font-size:13px;font-weight:500;margin-bottom:5px;color:#1C2B3A}
.sl-fg input,.sl-fg select{width:100%;padding:10px 12px;border:1.5px solid #DDE3EE;
  border-radius:8px;font-size:14px;font-family:inherit;outline:none;
  box-sizing:border-box;transition:.15s;background:#fff}
.sl-fg input:focus,.sl-fg select:focus{border-color:#2E5FAD}
.sl-row{display:flex;gap:8px}
.sl-row .sl-fg{flex:1}
.sl-btn{width:100%;padding:12px;background:#1A3A6B;color:#fff;border:none;
  border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;
  font-family:inherit;margin-top:2px;transition:.15s}
.sl-btn:hover{background:#2E5FAD}
.sl-btn:disabled{opacity:.6;cursor:not-allowed}
.sl-err{color:#DC2626;font-size:13px;margin-top:10px;display:none}
  `;
  document.head.appendChild(style);

  /* ── 모달 HTML 생성 ──────────────────────────────────── */
  function _tabBtn(id, label) {
    return `<button onclick="SAMIL_LOGIN._tab('${id}',this)">${label}</button>`;
  }
  const tabBtns = [
    showSt ? _tabBtn('st', '학생')    : '',
    showTc ? _tabBtn('tc', '담임교사') : '',
    showAd ? _tabBtn('ad', '관리자')  : '',
  ].filter(Boolean);
  // 첫 번째 버튼 active
  if (tabBtns.length) tabBtns[0] = tabBtns[0].replace('<button', '<button class="active"');
  const tabBar = tabBtns.length > 1
    ? `<div class="sl-tab">${tabBtns.join('')}</div>` : '';

  const tplSt = showSt ? `
  <div id="sl-st" style="display:${firstTab==='st'?'block':'none'}">
    <div class="sl-fg"><label>학과</label>
      <select id="sl-st-dept"><option value="">선택</option></select></div>
    <div class="sl-fg"><label>학번</label>
      <input id="sl-st-id" placeholder="예: 3104"
        onkeydown="if(event.key==='Enter')SAMIL_LOGIN._loginSt()"></div>
    <div class="sl-fg"><label>비밀번호</label>
      <input type="password" id="sl-st-pw" placeholder="초기: 생년월일 6자리"
        onkeydown="if(event.key==='Enter')SAMIL_LOGIN._loginSt()"></div>
    <button class="sl-btn" id="sl-st-btn" onclick="SAMIL_LOGIN._loginSt()">로그인</button>
  </div>` : '';

  const tplTc = showTc ? `
  <div id="sl-tc" style="display:${firstTab==='tc'?'block':'none'}">
    <div class="sl-fg"><label>학과</label>
      <select id="sl-tc-dept" onchange="SAMIL_LOGIN._updateCls()">
        <option value="">선택</option></select></div>
    <div class="sl-row">
      <div class="sl-fg"><label>학년</label>
        <select id="sl-tc-grade" onchange="SAMIL_LOGIN._updateCls()">
          <option value="">학년</option>
          <option>1</option><option>2</option><option>3</option>
        </select></div>
      <div class="sl-fg"><label>반</label>
        <select id="sl-tc-cls"><option value="">반</option></select></div>
    </div>
    <div class="sl-fg"><label>이름</label>
      <input id="sl-tc-name" placeholder="홍길동"
        onkeydown="if(event.key==='Enter')SAMIL_LOGIN._loginTc()"></div>
    <div class="sl-fg"><label>비밀번호</label>
      <input type="password" id="sl-tc-pw"
        onkeydown="if(event.key==='Enter')SAMIL_LOGIN._loginTc()"></div>
    <button class="sl-btn" id="sl-tc-btn" onclick="SAMIL_LOGIN._loginTc()">로그인</button>
  </div>` : '';

  const tplAd = showAd ? `
  <div id="sl-ad" style="display:${firstTab==='ad'?'block':'none'}">
    <div class="sl-fg"><label>관리자 비밀번호</label>
      <input type="password" id="sl-ad-pw"
        onkeydown="if(event.key==='Enter')SAMIL_LOGIN._loginAd()"></div>
    <button class="sl-btn" id="sl-ad-btn" onclick="SAMIL_LOGIN._loginAd()">로그인</button>
  </div>` : '';

  document.body.insertAdjacentHTML('afterbegin', `
<div id="samilLoginModal" onclick="if(event.target.id==='samilLoginModal')closeLogin()">
  <div class="sl-box">
    <div class="sl-header">
      <h3>로그인</h3>
      <button class="sl-close" onclick="closeLogin()">✕</button>
    </div>
    <div class="sl-body">
      ${tabBar}
      ${tplSt}${tplTc}${tplAd}
      <div class="sl-err" id="sl-err"></div>
    </div>
  </div>
</div>`);

  /* ── 내부 상태 ────────────────────────────────────────── */
  let _classes = [];

  /* ── 에러 표시 ────────────────────────────────────────── */
  function _err(msg) {
    const el = document.getElementById('sl-err');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  /* ── 탭 전환 ─────────────────────────────────────────── */
  function _tab(id, btn) {
    ['st','tc','ad'].forEach(t => {
      const el = document.getElementById('sl-' + t);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById('sl-' + id);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.sl-tab button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _err('');
    if (id === 'tc') _loadTcDepts();
    if (id === 'st') _loadStDepts();
  }

  /* ── 학과 · 반 로드 ──────────────────────────────────── */
  async function _loadStDepts() {
    const sel = document.getElementById('sl-st-dept');
    if (!sel || sel.options.length > 1) return;
    try {
      const res = await SAMIL_API.getDepts();
      (res.data || []).forEach(d => {
        const o = document.createElement('option');
        o.value = o.textContent = d.name || d;
        sel.appendChild(o);
      });
    } catch (_) {}
  }

  async function _loadTcDepts() {
    const sel = document.getElementById('sl-tc-dept');
    if (!sel || sel.options.length > 1) return;
    try {
      const [dr, cr] = await Promise.all([
        SAMIL_API.getDepts(),
        SAMIL_API.getClasses({ year: new Date().getFullYear() }),
      ]);
      (dr.data || []).forEach(d => {
        const o = document.createElement('option');
        o.value = o.textContent = d.name || d;
        sel.appendChild(o);
      });
      if (cr && cr.success) _classes = cr.data || [];
    } catch (_) {}
  }

  function _updateCls() {
    const dept  = (document.getElementById('sl-tc-dept')  || {}).value || '';
    const grade = (document.getElementById('sl-tc-grade') || {}).value || '';
    const sel   = document.getElementById('sl-tc-cls');
    if (!sel) return;
    sel.innerHTML = '<option value="">반</option>';
    if (!dept || !grade) return;
    const nums = _classes
      .filter(c => c.dept === dept && String(c.grade) === String(grade))
      .map(c => Number(c.num || c.cls))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    // 클래스 정보가 없으면 기본 1~4
    (nums.length ? nums : [1, 2, 3, 4]).forEach(n => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    });
    if (nums.length === 1) sel.value = nums[0];
  }

  /* ── 버튼 로딩 상태 ──────────────────────────────────── */
  function _btnLoad(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = loading ? '확인중…' : '로그인';
    btn.disabled = loading;
  }

  /* ── 학생 로그인 ─────────────────────────────────────── */
  async function _loginSt() {
    const dept = (document.getElementById('sl-st-dept') || {}).value || '';
    const id   = ((document.getElementById('sl-st-id')  || {}).value || '').trim();
    const pw   = (document.getElementById('sl-st-pw')   || {}).value || '';
    if (!dept)    { _err('학과를 선택하세요'); return; }
    if (!id || !pw) { _err('학번과 비밀번호를 입력하세요'); return; }
    _btnLoad('sl-st-btn', true);
    try {
      const res = await SAMIL_API.loginStudent(dept, id, pw);
      if (res.success) {
        sessionStorage.setItem('samilStudentAuth', res.student.id);
        sessionStorage.setItem('samilStudentME',   JSON.stringify(res.student));
        closeLogin();
        updateNavAuth();
        if (cfg.onSuccess) cfg.onSuccess('student');
      } else {
        _btnLoad('sl-st-btn', false);
        const pwEl = document.getElementById('sl-st-pw');
        if (pwEl) pwEl.value = '';
        _err(res.error || '학과/학번/비밀번호가 일치하지 않습니다.');
      }
    } catch (_) { _btnLoad('sl-st-btn', false); _err('오류가 발생했습니다.'); }
  }

  /* ── 담임 로그인 ─────────────────────────────────────── */
  async function _loginTc() {
    const dept  = (document.getElementById('sl-tc-dept')  || {}).value || '';
    const grade = (document.getElementById('sl-tc-grade') || {}).value || '';
    const cls   = (document.getElementById('sl-tc-cls')   || {}).value || '';
    const name  = ((document.getElementById('sl-tc-name') || {}).value || '').trim();
    const pw    = (document.getElementById('sl-tc-pw')    || {}).value || '';
    if (!dept || !grade || !cls || !name || !pw) { _err('모든 항목을 입력하세요'); return; }
    _btnLoad('sl-tc-btn', true);
    try {
      const res = await SAMIL_API.loginTeacher(dept, grade, cls, name, pw);
      if (res.success) {
        sessionStorage.setItem('samilTeacherAuth', res.teacher.id);
        sessionStorage.setItem('samilTeacherME',   JSON.stringify(res.teacher));
        sessionStorage.setItem('statsMe',           JSON.stringify({ ...res.teacher, role: 'teacher' }));
        closeLogin();
        updateNavAuth();
        if (cfg.onSuccess) cfg.onSuccess('teacher');
      } else {
        _btnLoad('sl-tc-btn', false);
        const pwEl = document.getElementById('sl-tc-pw');
        if (pwEl) pwEl.value = '';
        _err(res.error || '담임 계정 정보가 맞지 않습니다.');
      }
    } catch (_) { _btnLoad('sl-tc-btn', false); _err('오류가 발생했습니다.'); }
  }

  /* ── 관리자 로그인 ───────────────────────────────────── */
  async function _loginAd() {
    const pw = (document.getElementById('sl-ad-pw') || {}).value || '';
    if (!pw) { _err('비밀번호를 입력하세요'); return; }
    _btnLoad('sl-ad-btn', true);
    try {
      const res = await SAMIL_API.verifyAdminPw(pw);
      if (res.success) {
        sessionStorage.setItem('samilAdminAuth', '1');
        sessionStorage.setItem('samilAdminToken', pw);  // ★ 보안 패치: 입력한 PW를 API 토큰으로 저장
        sessionStorage.setItem('statsMe', JSON.stringify({ role: 'admin', name: '관리자' }));
        closeLogin();
        updateNavAuth();
        if (cfg.onSuccess) cfg.onSuccess('admin');
      } else {
        _btnLoad('sl-ad-btn', false);
        const pwEl = document.getElementById('sl-ad-pw');
        if (pwEl) pwEl.value = '';
        _err('비밀번호가 맞지 않습니다.');
      }
    } catch (_) { _btnLoad('sl-ad-btn', false); _err('오류가 발생했습니다.'); }
  }

  /* ── 관리자 비밀번호 변경 모달 ───────────────────────── */
  function _injectChangePwModal() {
    if (document.getElementById('samilChangePwModal')) return;
    const el = document.createElement('div');
    el.id = 'samilChangePwModal';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;padding:16px';
    el.innerHTML = `
      <div class="sl-box" style="max-width:360px">
        <div class="sl-header">
          <h3>🔑 관리자 비밀번호 변경</h3>
          <button class="sl-close" onclick="closeChangeAdminPw()">✕</button>
        </div>
        <div style="padding:20px">
          <div class="sl-fg">
            <label class="sl-label">현재 비밀번호</label>
            <input id="cpw-current" type="password" class="sl-input" placeholder="현재 비밀번호 입력">
          </div>
          <div class="sl-fg">
            <label class="sl-label">새 비밀번호</label>
            <input id="cpw-new" type="password" class="sl-input" placeholder="새 비밀번호 (8자 이상 권장)">
          </div>
          <div class="sl-fg">
            <label class="sl-label">새 비밀번호 확인</label>
            <input id="cpw-confirm" type="password" class="sl-input" placeholder="새 비밀번호 다시 입력"
              onkeydown="if(event.key==='Enter')_doChangeAdminPw()">
          </div>
          <div id="cpw-err" style="color:#DC2626;font-size:13px;min-height:18px;margin-bottom:8px"></div>
          <button id="cpw-btn" class="sl-btn" onclick="_doChangeAdminPw()" style="width:100%">비밀번호 변경</button>
          <div id="cpw-ok" style="display:none;text-align:center;color:#16A34A;font-size:14px;font-weight:600;padding:10px 0">
            ✅ 비밀번호가 성공적으로 변경되었습니다.
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function openChangeAdminPw() {
    _injectChangePwModal();
    const modal = document.getElementById('samilChangePwModal');
    // 입력 초기화
    ['cpw-current','cpw-new','cpw-confirm'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('cpw-err').textContent = '';
    document.getElementById('cpw-ok').style.display = 'none';
    document.getElementById('cpw-btn').style.display = '';
    modal.style.display = 'flex';
  }

  function closeChangeAdminPw() {
    const modal = document.getElementById('samilChangePwModal');
    if (modal) modal.style.display = 'none';
  }

  async function _doChangeAdminPw() {
    const cur     = (document.getElementById('cpw-current') || {}).value || '';
    const newPw   = (document.getElementById('cpw-new')     || {}).value || '';
    const confirm = (document.getElementById('cpw-confirm') || {}).value || '';
    const errEl   = document.getElementById('cpw-err');
    const btn     = document.getElementById('cpw-btn');

    errEl.textContent = '';
    if (!cur)              { errEl.textContent = '현재 비밀번호를 입력하세요.'; return; }
    if (!newPw)            { errEl.textContent = '새 비밀번호를 입력하세요.'; return; }
    if (newPw.length < 6)  { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; return; }
    if (newPw !== confirm)  { errEl.textContent = '새 비밀번호가 일치하지 않습니다.'; return; }
    if (cur === newPw)      { errEl.textContent = '현재 비밀번호와 동일합니다.'; return; }

    btn.disabled = true; btn.textContent = '변경 중...';
    try {
      const res = await SAMIL_API.changeAdminPw(cur, newPw);
      if (res && res.success) {
        // 세션 토큰도 새 비밀번호로 갱신
        sessionStorage.setItem('samilAdminToken', newPw);
        btn.style.display = 'none';
        document.getElementById('cpw-ok').style.display = '';
        setTimeout(closeChangeAdminPw, 2000);
      } else {
        errEl.textContent = res?.error || '현재 비밀번호가 맞지 않거나 오류가 발생했습니다.';
        btn.disabled = false; btn.textContent = '비밀번호 변경';
        const curEl = document.getElementById('cpw-current');
        if (curEl) curEl.value = '';
      }
    } catch(e) {
      errEl.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
      btn.disabled = false; btn.textContent = '비밀번호 변경';
    }
  }

  /* ── Nav 인증 영역 갱신 ──────────────────────────────── */
  function updateNavAuth() {
    const el = document.getElementById(cfg.navAuthId);
    if (!el) return;
    if (sessionStorage.getItem('samilAdminAuth') === '1') {
      el.innerHTML =
        `<a href="admin.html" class="nav-login" style="background:#16A34A!important">관리자 페이지</a>` +
        `<a href="#" onclick="openChangeAdminPw();return false"
           style="color:rgba(255,255,255,.7);font-size:13px;padding:7px 10px">🔑 비번변경</a>` +
        `<a href="#" onclick="doLogout();return false"
           style="color:rgba(255,255,255,.7);font-size:13px;padding:7px 10px">로그아웃</a>`;
    } else if (sessionStorage.getItem('samilTeacherAuth')) {
      const t = JSON.parse(sessionStorage.getItem('samilTeacherME') || '{}');
      el.innerHTML =
        `<a href="teacher.html" class="nav-login" style="background:#16A34A!important">${t.name || '담임'} 선생님</a>` +
        `<a href="#" onclick="doLogout();return false"
           style="color:rgba(255,255,255,.7);font-size:13px;padding:7px 10px">로그아웃</a>`;
    } else if (sessionStorage.getItem('samilStudentAuth')) {
      const s = JSON.parse(sessionStorage.getItem('samilStudentME') || '{}');
      el.innerHTML =
        `<a href="student.html" class="nav-login" style="background:#16A34A!important">${s.name || '학생'}님</a>` +
        `<a href="#" onclick="doLogout();return false"
           style="color:rgba(255,255,255,.7);font-size:13px;padding:7px 10px">로그아웃</a>`;
    } else {
      el.innerHTML =
        `<a href="#" class="nav-login" onclick="openLogin();return false">로그인</a>`;
    }
  }

  /* ── 로그아웃 ────────────────────────────────────────── */
  function doLogout() {
    ['samilAdminAuth','samilAdminToken','samilTeacherAuth','samilTeacherME',
     'samilStudentAuth','samilStudentME','statsMe'].forEach(k => sessionStorage.removeItem(k));
    updateNavAuth();
    if (cfg.onLogout) cfg.onLogout();
  }

  /* ── 모달 열기 / 닫기 ────────────────────────────────── */
  function openLogin() {
    const modal = document.getElementById('samilLoginModal');
    if (!modal) return;
    _err('');
    // 첫 탭으로 초기화
    const firstBtn = modal.querySelector('.sl-tab button');
    _tab(firstTab, firstBtn);
    modal.classList.add('open');
  }

  function closeLogin() {
    const modal = document.getElementById('samilLoginModal');
    if (modal) modal.classList.remove('open');
    _err('');
  }

  /* ── 공개 API ─────────────────────────────────────────── */
  window.SAMIL_LOGIN        = { _tab, _updateCls, _loginSt, _loginTc, _loginAd };
  window.openLogin          = openLogin;
  window.closeLogin         = closeLogin;
  window.updateNavAuth      = updateNavAuth;
  window.doLogout           = doLogout;
  window.openChangeAdminPw  = openChangeAdminPw;
  window.closeChangeAdminPw = closeChangeAdminPw;
  window._doChangeAdminPw   = _doChangeAdminPw;

  // 페이지 로드 시 nav 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavAuth);
  } else {
    updateNavAuth();
  }
})();
