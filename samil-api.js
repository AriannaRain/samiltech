/**
 * samil-api.js  ─  GAS 클라이언트 API 레이어
 * - TTL 기반 localStorage 캐시 (cold start 지연 완화)
 * - mutating 작업 후 캐시 자동 무효화
 */

const SAMIL_API = (() => {
  const GAS_URL     = 'https://script.google.com/macros/s/AKfycby6UpyOV0rxKOUbQkerpniceHPAgZOkLfNKJC5JFyEJqxmJbe_4BcK-HOPCHOmahnnA_g/exec';
  const ADMIN_TOKEN = 'samil_admin_2024';

  // ── 캐시 헬퍼 (localStorage 기반, TTL ms) ──
  function _getCache(key) {
    try {
      const raw = localStorage.getItem('_sc_' + key);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (Date.now() - item.ts > item.ttl) { localStorage.removeItem('_sc_' + key); return null; }
      return item.data;
    } catch(e) { return null; }
  }
  function _setCache(key, data, ttl = 300000) { // default 5분
    try { localStorage.setItem('_sc_' + key, JSON.stringify({ data, ts: Date.now(), ttl })); } catch(e) {}
  }
  function _invalidate(...keys) {
    keys.forEach(k => { try { localStorage.removeItem('_sc_' + k); } catch(e) {} });
  }

  // ── 기본 호출 ──
  async function call(params) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(params),
    });
    const text = await res.text();
    return JSON.parse(text);
  }
  async function get(params) {
    const qs  = new URLSearchParams({ ...params }).toString();
    const res = await fetch(`${GAS_URL}?${qs}`);
    const text = await res.text();
    return JSON.parse(text);
  }

  // ══════════════════════════════════════════
  // Public reads (캐시 적용)
  // ══════════════════════════════════════════
  async function getDepts() {
    const cached = _getCache('depts');
    if (cached) return cached;
    const res = await get({ action: 'getDepts' });
    if (res.success) _setCache('depts', res, 3600000); // 1시간
    return res;
  }

  async function getJobs(activeOnly = false) {
    const key    = 'jobs_' + activeOnly;
    const cached = _getCache(key);
    if (cached) return cached;
    const res = await get({ action: 'getJobs', activeOnly });
    if (res.success) _setCache(key, res, 300000); // 5분
    return res;
  }

  async function getBanners() {
    const cached = _getCache('banners');
    if (cached) return cached;
    const res = await get({ action: 'getBanners' });
    if (res.success) _setCache('banners', res, 300000);
    return res;
  }

  async function getStats()       { return get({ action: 'getStats' }); }
  async function getArchive(opts) { return get({ action: 'getArchive', ...opts }); }

  // ── 연도별 학년-반 구조 ──
  async function getClasses(opts = {}) {
    return get({ action: 'getClasses', ...opts });
  }

  // ── 홈 취업현황 집계 ──
  async function getEmployStats(opts = {}) {
    return get({ action: 'getEmployStats', ...opts });
  }

  // ── 이전 연도 취업현황 기록 ──
  async function getEmployData(opts = {}) {
    return get({ action: 'getEmployData', ...opts });
  }

  // ══════════════════════════════════════════
  // 공고 관리 (Admin, 캐시 무효화)
  // ══════════════════════════════════════════
  async function addJob(job) {
    const res = await call({ action: 'addJob', token: ADMIN_TOKEN, ...job });
    _invalidate('jobs_false', 'jobs_true');
    return res;
  }
  async function updateJob(job) {
    const res = await call({ action: 'updateJob', token: ADMIN_TOKEN, ...job });
    _invalidate('jobs_false', 'jobs_true');
    return res;
  }
  async function deleteJob(id) {
    const res = await call({ action: 'deleteJob', token: ADMIN_TOKEN, id });
    _invalidate('jobs_false', 'jobs_true');
    return res;
  }
  async function toggleJob(id) {
    const res = await call({ action: 'toggleJob', token: ADMIN_TOKEN, id });
    _invalidate('jobs_false', 'jobs_true');
    return res;
  }

  // ══════════════════════════════════════════
  // 배너 관리 (캐시 무효화)
  // ══════════════════════════════════════════
  async function addBanner(b) {
    const res = await call({ action: 'addBanner', token: ADMIN_TOKEN, ...b });
    _invalidate('banners');
    return res;
  }
  async function deleteBanner(id) {
    const res = await call({ action: 'deleteBanner', token: ADMIN_TOKEN, id });
    _invalidate('banners');
    return res;
  }

  // ══════════════════════════════════════════
  // 학과 관리 (캐시 무효화)
  // ══════════════════════════════════════════
  async function addDept(d) {
    const res = await call({ action: 'addDept', token: ADMIN_TOKEN, ...d });
    _invalidate('depts');
    return res;
  }
  async function deleteDept(name) {
    const res = await call({ action: 'deleteDept', token: ADMIN_TOKEN, name });
    _invalidate('depts');
    return res;
  }

  // ══════════════════════════════════════════
  // 교사 관리
  // ══════════════════════════════════════════
  async function addTeacher(t) {
    return call({ action: 'addTeacher', token: ADMIN_TOKEN, ...t });
  }
  async function deleteTeacher(t) {
    return call({ action: 'deleteTeacher', token: ADMIN_TOKEN, ...t });
  }
  async function getTeachers(opts = {}) {
    return call({ action: 'getTeachers', token: ADMIN_TOKEN, ...opts });
  }

  // ══════════════════════════════════════════
  // 학년-반 구조 저장
  // ══════════════════════════════════════════
  async function saveClasses(opts = {}) {
    return call({ action: 'saveClasses', token: ADMIN_TOKEN, ...opts });
  }

  // ══════════════════════════════════════════
  // 이전 연도 취업현황 기록 저장
  // ══════════════════════════════════════════
  async function saveEmployData(opts = {}) {
    return call({ action: 'saveEmployData', token: ADMIN_TOKEN, ...opts });
  }

  // ══════════════════════════════════════════
  // 학생 관련
  // ══════════════════════════════════════════
  async function loginStudent(dept, id, pw)  { return call({ action: 'loginStudent', dept, id, pw }); }
  async function loginTeacher(p)             { return call({ action: 'loginTeacher', ...p }); }

  async function getStudents(opts = {}) {
    const params = { action: 'getStudents', ...opts };
    if (opts.adminMode) params.token = ADMIN_TOKEN;
    return call(params);
  }

  async function addStudent(s)        { return call({ action: 'addStudent', token: ADMIN_TOKEN, ...s }); }
  async function saveRecord(r, tid)   { return call({ action: 'saveRecord', teacherId: tid, record: JSON.stringify(r) }); }
  async function saveRecords(rs, tid) { return call({ action: 'saveRecords', teacherId: tid, records: JSON.stringify(rs) }); }
  async function getMyRecord(studentId) { return call({ action: 'getMyRecord', studentId }); }
  async function resetStudentPw(id)   { return call({ action: 'resetStudentPw', token: ADMIN_TOKEN, id }); }
  async function changeStudentPw(studentId, curPw, newPw) { return call({ action: 'changeStudentPw', studentId, curPw, newPw }); }
  async function changeTeacherPw(p)   { return call({ action: 'changeTeacherPw', ...p }); }

  // ── 취업/진학 상태 업데이트 ──
  async function updateStudentEmploy(opts = {}) {
    const params = { action: 'updateStudentEmploy', ...opts };
    if (!params.teacherId) params.token = ADMIN_TOKEN;
    return call(params);
  }

  // ══════════════════════════════════════════
  // 통계
  // ══════════════════════════════════════════
  async function saveAnnualStat(p)   { return call({ action: 'saveAnnualStat',   token: ADMIN_TOKEN, ...p }); }
  async function deleteAnnualStat(p) { return call({ action: 'deleteAnnualStat', token: ADMIN_TOKEN, ...p }); }
  async function saveEmploy(p)       { return call({ action: 'saveEmploy',        token: ADMIN_TOKEN, ...p }); }
  async function initSheets()        { return call({ action: 'initSheets',        token: ADMIN_TOKEN }); }
  async function getJobStats(p)      { return call({ action: 'getJobStats',       ...p }); }
  async function incrementView(jobId){ return call({ action: 'incrementView',     jobId }); }

  // ══════════════════════════════════════════
  // 지원·관심
  // ══════════════════════════════════════════
  async function applyJob(p)         { return call({ action: 'applyJob',        ...p }); }
  async function applyJobs(p)        { return call({ action: 'applyJobs',       ...p }); }
  async function getApplicants(p)    { return call({ action: 'getApplicants',   token: ADMIN_TOKEN, ...p }); }
  async function getApplicantsTc(p)  { return call({ action: 'getApplicants',   ...p }); }
  async function deleteApply(p)      { return call({ action: 'deleteApply',     token: ADMIN_TOKEN, ...p }); }
  async function deleteApplyTc(p)    { return call({ action: 'deleteApply',     ...p }); }
  async function toggleInterest(p)   { return call({ action: 'toggleInterest',  ...p }); }
  async function getInterested(p)    { return call({ action: 'getInterested',   token: ADMIN_TOKEN, ...p }); }
  async function getMyInterests(p)   { return call({ action: 'getMyInterests',  ...p }); }

  // ══════════════════════════════════════════
  // 파일 업로드
  // ══════════════════════════════════════════
  async function uploadFile(name, base64, mimeType) {
    return call({ action: 'uploadFileToDrive', token: ADMIN_TOKEN, name, base64, mimeType });
  }

  return {
    // reads
    getDepts, getJobs, getBanners, getStats, getArchive,
    getClasses, getEmployStats, getEmployData,
    // 공고 admin
    addJob, updateJob, deleteJob, toggleJob,
    // 배너 admin
    addBanner, deleteBanner,
    // 학과 admin
    addDept, deleteDept,
    // 교사
    addTeacher, deleteTeacher, getTeachers, saveClasses, changeTeacherPw,
    // 취업현황 기록
    saveEmployData,
    // 학생
    loginStudent, loginTeacher, getStudents, addStudent,
    saveRecord, saveRecords, getMyRecord,
    resetStudentPw, changeStudentPw,
    updateStudentEmploy,
    // 통계
    saveAnnualStat, deleteAnnualStat, saveEmploy, initSheets,
    getJobStats, incrementView,
    // 지원·관심
    applyJob, applyJobs,
    getApplicants, getApplicantsTc,
    deleteApply, deleteApplyTc,
    toggleInterest, getInterested, getMyInterests,
    // 파일
    uploadFile,
  };
})();
