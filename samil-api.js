/**
 * samil-api.js  —  Google Apps Script API 레이어
 */

const SAMIL_API = (() => {
  const GAS_URL     = 'https://script.google.com/macros/s/AKfycby6UpyOV0rxKOUbQkerpniceHPAgZOkLfNKJC5JFyEJqxmJbe_4BcK-HOPCHOmahnnA_g/exec';
  // ★ 보안 패치: ADMIN_TOKEN 하드코딩 제거 → 동적 토큰 사용
  function getAdminToken() {
    return sessionStorage.getItem('samilAdminToken') || '';
  }

  // ════════════════════════════════════════════
  // TTL 캐시 (메모리)
  // ════════════════════════════════════════════
  const _cache = {};
  const _TTL = { getAll: 300000, jobs: 300000, depts: 3600000, banners: 3600000, reviews: 3600000 };
  function _cGet(k) { const c=_cache[k]; if(!c||Date.now()-c.t>c.ttl){delete _cache[k];return null;} return c.d; }
  function _cSet(k,d,ttl) { _cache[k]={d,t:Date.now(),ttl}; }
  function _cDel(...keys) { keys.forEach(k=>delete _cache[k]); }
  function _yearKey() { return 'getAll_'+new Date().getFullYear(); }

  // ════════════════════════════════════════════
  // localStorage 영속 캐시 (페이지 리로드 간 유지)
  // ── 메모리 캐시 → localStorage → 네트워크 순으로 조회하여
  //    Google Apps Script Cold Start 지연 최소화
  // ════════════════════════════════════════════
  const _LS_PREFIX = 'samilApi_v1_';
  function _lsGet(k) {
    try {
      const raw = localStorage.getItem(_LS_PREFIX + k);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (Date.now() - c.t > c.ttl) { localStorage.removeItem(_LS_PREFIX + k); return null; }
      return c.d;
    } catch(_) { return null; }
  }
  function _lsSet(k, d, ttl) {
    try { localStorage.setItem(_LS_PREFIX + k, JSON.stringify({ d, t: Date.now(), ttl })); } catch(_) {}
  }
  function _lsDel(...keys) {
    keys.forEach(k => { try { localStorage.removeItem(_LS_PREFIX + k); } catch(_) {} });
  }

  async function call(params, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(params),
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      console.error('[SAMIL_API]', e);
      const msg = e.name === 'AbortError' ? '서버 응답 시간 초과 (20초)' : e.message;
      return { success: false, error: msg, timeout: e.name === 'AbortError' };
    }
  }

  async function get(params, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      params._t = Date.now();
      const qs  = new URLSearchParams(params).toString();
      const res = await fetch(`${GAS_URL}?${qs}`, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      const msg = e.name === 'AbortError' ? '서버 응답 시간 초과 (15초)' : e.message;
      return { success: false, error: msg, timeout: e.name === 'AbortError' };
    }
  }

  // ════════════════════════════════════════════
  // 채용공고
  // ════════════════════════════════════════════
  async function getJobs(activeOnly = false) {
    if (activeOnly) return get({ action: 'getJobs', activeOnly });
    const c = _cGet('jobs'); if (c) return c;
    const r = await get({ action: 'getJobs', activeOnly });
    if (r.success) _cSet('jobs', r, _TTL.jobs);
    return r;
  }

  // ════════════════════════════════════════════
  // 배치 (Cold Start 최소화)
  // ════════════════════════════════════════════
  async function getAll(year) {
    const k = 'getAll_'+(year||new Date().getFullYear());
    // 1순위: 메모리 캐시 (동일 세션 내 재호출 즉시 반환)
    const mc = _cGet(k); if (mc) return mc;
    // 2순위: localStorage 캐시 (리로드 후에도 TTL 내면 즉시 반환 → GAS Cold Start 회피)
    const lc = _lsGet(k);
    if (lc) { _cSet(k, lc, _TTL.getAll); return lc; }
    // 3순위: 네트워크 (GAS 호출)
    const r = await get({ action: 'getAll', year: year || new Date().getFullYear() });
    if (r.success) { _cSet(k, r, _TTL.getAll); _lsSet(k, r, _TTL.getAll); }
    return r;
  }

  // ════════════════════════════════════════════
  // 관리연도
  // ════════════════════════════════════════════
  async function getYears() {
    return get({ action: 'getYears' });
  }

  async function addYear(year) {
    return call({ action: 'addYear', token: getAdminToken(), year });
  }

  async function deleteYear(year) {
    return call({ action: 'deleteYear', token: getAdminToken(), year });
  }

  async function addJob(data) {
    _cDel('jobs', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'addJob', token: getAdminToken(), ...flattenJob(data) });
  }

  async function updateJob(data) {
    _cDel('jobs', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'updateJob', token: getAdminToken(), id: data.id, ...flattenJob(data) });
  }

  async function deleteJob(id) {
    _cDel('jobs', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'deleteJob', token: getAdminToken(), id });
  }

  async function toggleJob(id) {
    _cDel('jobs', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'toggleJob', token: getAdminToken(), id });
  }

  function flattenJob(d) {
    return {
      type: d.type || '기타',
      co: d.co, job: d.job, loc: d.loc, cnt: d.cnt, dl: d.dl,
      tags: Array.isArray(d.tags) ? d.tags.join(',') : (d.tags || ''),
      rec: String(!!d.rec),
      recCnt: d.recCnt || 0,
      files: Array.isArray(d.files)
        ? d.files.map(f => `${f.name}::${f.url}`).join('|')
        : (d.files || ''),
    };
  }

  // ════════════════════════════════════════════
  // 학생 로그인 / 정보
  // ════════════════════════════════════════════
  async function loginStudent(dept, id, pw) {
    return call({ action: 'loginStudent', dept, id, pw });
  }

  async function getStudents(opts = {}) {
    const params = { action: 'getStudents', ...opts };
    if (opts.adminMode) params.token = getAdminToken();
    return call(params);
  }

  async function getMyRecord(studentId) {
    return call({ action: 'getMyRecord', studentId });
  }

  async function saveRecord(record, teacherId) {
    return call({ action: 'saveRecord', teacherId, record: JSON.stringify(record) });
  }

  // 배치 저장 — 단건 반복 대신 1회 호출
  async function saveRecords(records, teacherId) {
    return call({ action: 'saveRecords', teacherId, records: JSON.stringify(records) });
  }

  async function addStudent(data) {
    return call({ action: 'addStudent', token: getAdminToken(), ...data });
  }

  async function resetStudentPw(id) {
    return call({ action: 'resetStudentPw', token: getAdminToken(), id });
  }

  // ════════════════════════════════════════════
  // 담임교사 로그인 / 계정
  // ════════════════════════════════════════════
  async function loginTeacher(dept, grade, cls, name, pw) {
    return call({ action: 'loginTeacher', dept, grade, cls, name, pw });
  }

  async function changeTeacherPw(data) {
    return call({ action: 'changeTeacherPw', ...data });
  }

  async function changeStudentPw(data) {
    return call({ action: 'changeStudentPw', ...data });
  }

  async function addTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'addTeacher', token: getAdminToken(), ...data });
  }

  async function deleteTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'deleteTeacher', token: getAdminToken(), ...data });
  }

  async function updateTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'updateTeacher', token: getAdminToken(), ...data });
  }

  async function getJobStats()            { return get({ action: 'getJobStats' }); }
  async function incrementView(jobId)     { return call({ action: 'incrementView', jobId }); }

  async function applyJob(data)         { return call({ action: 'applyJob',       ...data }); }
  async function applyJobs(data)        { return call({ action: 'applyJobs',      ...data }); }
  async function getApplicants(data)    { return call({ action: 'getApplicants',  ...data }); }
  async function deleteApply(data)      { return call({ action: 'deleteApply',    ...data }); }
  async function toggleInterest(data)   { return call({ action: 'toggleInterest', ...data }); }
  async function getInterested(data)    { return call({ action: 'getInterested',  token: getAdminToken(), ...data }); }
  async function getMyInterests(data)   { return call({ action: 'getMyInterests', ...data }); }

  // ════════════════════════════════════════════
  // 담임교사 / 학년-반 구조 (ScriptProperties)
  // ════════════════════════════════════════════
  async function getTeachers(opts = {}) {
    const year = opts.year || new Date().getFullYear();
    const k = 'teachers_' + year;
    const c = _cGet(k); if (c) return c;
    const r = await get({ action: 'getTeachers', ...opts });
    if (r.success) _cSet(k, r, _TTL.depts);
    return r;
  }

  async function getClasses(opts = {}) {
    const year = opts.year || new Date().getFullYear();
    const k = 'classes_' + year;
    const c = _cGet(k); if (c) return c;
    const r = await get({ action: 'getClasses', ...opts });
    if (r.success) _cSet(k, r, _TTL.depts);
    return r;
  }

  async function saveClasses(data) {
    _cDel('classes_'+(data.year||new Date().getFullYear()));
    return call({ action: 'saveClasses', token: getAdminToken(), ...data });
  }

  async function updateStudentEmploy(data) {
    return call({ action: 'updateStudentEmploy', token: getAdminToken(), ...data });
  }

  // ════════════════════════════════════════════
  // 학과
  // ════════════════════════════════════════════
  async function getDepts() {
    const c = _cGet('depts'); if (c) return c;
    const r = await get({ action: 'getDepts' });
    if (r.success) _cSet('depts', r, _TTL.depts);
    return r;
  }

  async function addDept(data) {
    _cDel('depts', _yearKey());
    return call({ action: 'addDept', token: getAdminToken(), ...data });
  }

  async function deleteDept(name) {
    _cDel('depts', _yearKey());
    return call({ action: 'deleteDept', token: getAdminToken(), name });
  }

  async function updateDept(oldName, newName, year) {
    _cDel('depts', _yearKey());
    return call({ action: 'updateDept', token: getAdminToken(), oldName, newName, year });
  }

  async function getStudentCountByClass(year) {
    return get({ action: 'getStudentCountByClass', year });
  }

  // ════════════════════════════════════════════
  // 배너
  // ════════════════════════════════════════════
  async function getBanners() {
    const c = _cGet('banners'); if (c) return c;
    const r = await get({ action: 'getBanners' });
    if (r.success) _cSet('banners', r, _TTL.banners);
    return r;
  }

  async function addBanner(data) {
    _cDel('banners', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'addBanner', token: getAdminToken(), ...data });
  }

  async function deleteBanner(id) {
    _cDel('banners', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'deleteBanner', token: getAdminToken(), id });
  }

  async function updateBanner(data) {
    _cDel('banners', _yearKey()); _lsDel(_yearKey());
    return call({ action: 'updateBanner', token: getAdminToken(), ...data });
  }

  // ════════════════════════════════════════════
  // 취업통계
  // ════════════════════════════════════════════
  async function verifyAdminPw(pw) {
    return call({ action: 'verifyAdminPw', pw });
  }

  async function changeAdminPw(currentPw, newPw) {
    return call({ action: 'changeAdminPw', currentPw, newPw, token: getAdminToken() });
  }

  async function getStats() {
    return get({ action: 'getStats' });
  }

  async function getEmployStats(year) {
    const k = 'employ_'+(year||new Date().getFullYear());
    const mc = _cGet(k); if (mc) return mc;
    const lc = _lsGet(k);
    if (lc) { _cSet(k, lc, _TTL.getAll); return lc; }
    const r = await get({ action: 'getEmployStats', year: year || new Date().getFullYear() });
    if (r.success) { _cSet(k, r, _TTL.getAll); _lsSet(k, r, _TTL.getAll); }
    return r;
  }

  async function saveEmployStats(year, data) {
    _cDel('employ_'+year, _yearKey());
    return call({ action: 'saveEmployStats', token: getAdminToken(), year, data: JSON.stringify(data) });
  }

  async function saveAnnualStat(data) {
    return call({ action: 'saveAnnualStat', token: getAdminToken(), ...data });
  }

  async function deleteAnnualStat(year) {
    return call({ action: 'deleteAnnualStat', token: getAdminToken(), year });
  }

  async function saveEmploy(data) {
    return call({ action: 'saveEmploy', token: getAdminToken(), ...data });
  }

  // ════════════════════════════════════════════
  // 선배취업아카이브
  // ════════════════════════════════════════════
  async function getArchive(dept = '') {
    return get({ action: 'getArchive', dept });
  }

  async function getReviews(dept = '') {
    if (dept) return get({ action: 'getReviews', dept });
    const c = _cGet('reviews'); if (c) return c;
    const r = await get({ action: 'getReviews', dept });
    if (r.success) _cSet('reviews', r, _TTL.reviews);
    return r;
  }

  async function addReview(data) {
    _cDel('reviews', _yearKey());
    return call({ action: 'addReview', token: getAdminToken(),
      year: data.year || '', type: data.type || '',
      co: data.co || '', dept: data.dept || '',
      sid: data.sid || '', sname: data.sname || '',
      middle: data.middle || '',
      certs: data.certs || '', attend: data.attend || '',
      clubs: data.clubs || '', summary: data.summary || '',
      review: data.review || '',
      essays: JSON.stringify(data.essays || []),
    });
  }

  async function deleteReview(id) {
    _cDel('reviews', _yearKey());
    return call({ action: 'deleteReview', token: getAdminToken(), id });
  }

  async function uploadFile(name, base64, mimeType) {
    return call({ action: 'uploadFileToDrive', token: getAdminToken(), name, base64, mimeType: mimeType || 'application/octet-stream' });
  }

  // ════════════════════════════════════════════
  // GAS 웜업 ping (cold start 선점)
  // ════════════════════════════════════════════
  function ping() {
    get({ action: 'getYears' }).catch(() => {});
  }

  // ════════════════════════════════════════════
  // 현장실습 섹션
  // ════════════════════════════════════════════
  async function getPracticeSections() {
    const c = _cGet('prSec'); if (c) return c;
    const r = await get({ action: 'getPracticeSections' });
    if (r.success) _cSet('prSec', r, 300000);
    return r;
  }
  async function addPracticeSection(data) {
    _cDel('prSec', 'prFiles');
    return call({ action: 'addPracticeSection', token: getAdminToken(), ...data });
  }
  async function updatePracticeSection(data) {
    _cDel('prSec', 'prFiles');
    return call({ action: 'updatePracticeSection', token: getAdminToken(), ...data });
  }
  async function deletePracticeSection(id) {
    _cDel('prSec', 'prFiles');
    return call({ action: 'deletePracticeSection', token: getAdminToken(), id });
  }
  async function reorderPracticeSection(orders) {
    _cDel('prSec');
    return call({ action: 'reorderPracticeSection', token: getAdminToken(), orders: JSON.stringify(orders) });
  }

  // ════════════════════════════════════════════
  // 현장실습 파일
  // ════════════════════════════════════════════
  async function getPracticeFiles(secId) {
    if (secId) return get({ action: 'getPracticeFiles', secId });
    const c = _cGet('prFiles'); if (c) return c;
    const r = await get({ action: 'getPracticeFiles', secId: '' });
    if (r.success) _cSet('prFiles', r, 300000);
    return r;
  }
  async function addPracticeFile(data) {
    _cDel('prFiles');
    return call({ action: 'addPracticeFile', token: getAdminToken(), ...data });
  }
  async function updatePracticeFile(data) {
    _cDel('prFiles');
    return call({ action: 'updatePracticeFile', token: getAdminToken(), ...data });
  }
  async function deletePracticeFile(id) {
    _cDel('prFiles');
    return call({ action: 'deletePracticeFile', token: getAdminToken(), id });
  }
  async function reorderPracticeFile(orders) {
    _cDel('prFiles');
    return call({ action: 'reorderPracticeFile', token: getAdminToken(), orders: JSON.stringify(orders) });
  }

  // ════════════════════════════════════════════
  // 시트 초기화
  // ════════════════════════════════════════════
  async function initSheets() {
    return call({ action: 'initSheets', token: getAdminToken() });
  }

  // ════════════════════════════════════════════
  // 프로그램 다운로드 관리
  // ════════════════════════════════════════════
  async function getPrograms() {
    const mc = _cGet('programs'); if (mc) return mc;
    const lc = _lsGet('programs');
    if (lc) { _cSet('programs', lc, 300000); return lc; }
    const r = await get({ action: 'getPrograms' });
    if (r.success) { _cSet('programs', r, 300000); _lsSet('programs', r, 300000); }
    return r;
  }

  async function addProgram(data) {
    _cDel('programs'); _lsDel('programs');
    return call({ action: 'addProgram', token: getAdminToken(), ...data });
  }

  async function deleteProgram(id) {
    _cDel('programs'); _lsDel('programs');
    return call({ action: 'deleteProgram', token: getAdminToken(), id });
  }

  return {
    getAll,
    getJobs, addJob, updateJob, deleteJob, toggleJob,
    getJobStats, incrementView,
    loginStudent, getStudents, getMyRecord, saveRecord, saveRecords, addStudent, resetStudentPw,
    loginTeacher, addTeacher, deleteTeacher, updateTeacher, changeTeacherPw, changeStudentPw,
    getTeachers, getClasses, saveClasses,
    updateStudentEmploy,
    getDepts, addDept, deleteDept, updateDept,
    getStudentCountByClass,
    getYears, addYear, deleteYear,
    verifyAdminPw, changeAdminPw,
    ping,
    getBanners, addBanner, deleteBanner, updateBanner,
    getStats, saveAnnualStat, deleteAnnualStat, saveEmploy,
    getEmployStats, saveEmployStats,
    getArchive, getReviews, addReview, deleteReview,
    applyJob, applyJobs, getApplicants, deleteApply,
    toggleInterest, getInterested, getMyInterests,
    uploadFile,
    getPracticeSections, addPracticeSection, updatePracticeSection, deletePracticeSection, reorderPracticeSection,
    getPracticeFiles, addPracticeFile, updatePracticeFile, deletePracticeFile, reorderPracticeFile,
    getPrograms, addProgram, deleteProgram,
    initSheets,
  };
})();
