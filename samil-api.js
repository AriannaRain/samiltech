/**
 * samil-api.js  —  Google Apps Script API 레이어
 */

const SAMIL_API = (() => {
  const GAS_URL     = 'https://script.google.com/macros/s/AKfycby6UpyOV0rxKOUbQkerpniceHPAgZOkLfNKJC5JFyEJqxmJbe_4BcK-HOPCHOmahnnA_g/exec';
  const ADMIN_TOKEN = 'samil_admin_2024';

  // ════════════════════════════════════════════
  // TTL 캐시 (메모리)
  // ════════════════════════════════════════════
  const _cache = {};
  const _TTL = { getAll: 300000, jobs: 300000, depts: 3600000, banners: 3600000, reviews: 3600000 };
  function _cGet(k) { const c=_cache[k]; if(!c||Date.now()-c.t>c.ttl){delete _cache[k];return null;} return c.d; }
  function _cSet(k,d,ttl) { _cache[k]={d,t:Date.now(),ttl}; }
  function _cDel(...keys) { keys.forEach(k=>delete _cache[k]); }
  function _yearKey() { return 'getAll_'+new Date().getFullYear(); }

  async function call(params) {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(params),
        redirect: 'follow',
      });
      return await res.json();
    } catch (e) {
      console.error('[SAMIL_API]', e);
      return { success: false, error: e.message };
    }
  }

  async function get(params) {
    try {
      params._t = Date.now();
      const qs  = new URLSearchParams(params).toString();
      const res = await fetch(`${GAS_URL}?${qs}`, { redirect: 'follow', cache: 'no-store' });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
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
    const c = _cGet(k); if (c) return c;
    const r = await get({ action: 'getAll', year: year || new Date().getFullYear() });
    if (r.success) _cSet(k, r, _TTL.getAll);
    return r;
  }

  // ════════════════════════════════════════════
  // 관리연도
  // ════════════════════════════════════════════
  async function getYears() {
    return get({ action: 'getYears' });
  }

  async function addYear(year) {
    return call({ action: 'addYear', token: ADMIN_TOKEN, year });
  }

  async function deleteYear(year) {
    return call({ action: 'deleteYear', token: ADMIN_TOKEN, year });
  }

  async function addJob(data) {
    _cDel('jobs', _yearKey());
    return call({ action: 'addJob', token: ADMIN_TOKEN, ...flattenJob(data) });
  }

  async function updateJob(data) {
    _cDel('jobs', _yearKey());
    return call({ action: 'updateJob', token: ADMIN_TOKEN, id: data.id, ...flattenJob(data) });
  }

  async function deleteJob(id) {
    _cDel('jobs', _yearKey());
    return call({ action: 'deleteJob', token: ADMIN_TOKEN, id });
  }

  async function toggleJob(id) {
    _cDel('jobs', _yearKey());
    return call({ action: 'toggleJob', token: ADMIN_TOKEN, id });
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
    if (opts.adminMode) params.token = ADMIN_TOKEN;
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
    return call({ action: 'addStudent', token: ADMIN_TOKEN, ...data });
  }

  async function resetStudentPw(id) {
    return call({ action: 'resetStudentPw', token: ADMIN_TOKEN, id });
  }

  // ════════════════════════════════════════════
  // 담임교사 로그인 / 계정
  // ════════════════════════════════════════════
  async function loginTeacher(dept, grade, cls, name, pw) {
    return call({ action: 'loginTeacher', dept, grade, cls, name, pw });
  }

  async function loginNonHomeTeacher(name, pw) {
    return call({ action: 'loginNonHomeTeacher', name, pw });
  }

  async function changeTeacherPw(data) {
    return call({ action: 'changeTeacherPw', ...data });
  }

  async function changeNonHomeTeacherPw(data) {
    return call({ action: 'changeNonHomeTeacherPw', ...data });
  }

  async function changeStudentPw(data) {
    return call({ action: 'changeStudentPw', ...data });
  }

  async function addTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'addTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function deleteTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'deleteTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function updateTeacher(data) {
    _cDel('teachers_'+(data.year||new Date().getFullYear()));
    return call({ action: 'updateTeacher', token: ADMIN_TOKEN, ...data });
  }

  // ════════════════════════════════════════════
  // 비담임교사
  // ════════════════════════════════════════════
  async function getNonHomeTeachers(opts = {}) {
    const year = opts.year || new Date().getFullYear();
    const k = 'nonHome_' + year;
    const c = _cGet(k); if (c) return c;
    const r = await get({ action: 'getNonHomeTeachers', ...opts });
    if (r.success) _cSet(k, r, _TTL.depts);
    return r;
  }

  async function addNonHomeTeacher(data) {
    _cDel('nonHome_' + (data.year || new Date().getFullYear()));
    return call({ action: 'addNonHomeTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function deleteNonHomeTeacher(data) {
    _cDel('nonHome_' + (data.year || new Date().getFullYear()));
    return call({ action: 'deleteNonHomeTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function updateNonHomeTeacher(data) {
    _cDel('nonHome_' + (data.year || new Date().getFullYear()));
    return call({ action: 'updateNonHomeTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function getJobStats()            { return get({ action: 'getJobStats' }); }
  async function incrementView(jobId)     { return call({ action: 'incrementView', jobId }); }

  async function applyJob(data)         { return call({ action: 'applyJob',       ...data }); }
  async function applyJobs(data)        { return call({ action: 'applyJobs',      ...data }); }
  async function getApplicants(data)    { return call({ action: 'getApplicants',  ...data }); }
  async function deleteApply(data)      { return call({ action: 'deleteApply',    ...data }); }
  async function toggleInterest(data)   { return call({ action: 'toggleInterest', ...data }); }
  async function getInterested(data)    { return call({ action: 'getInterested',  token: ADMIN_TOKEN, ...data }); }
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
    return call({ action: 'saveClasses', token: ADMIN_TOKEN, ...data });
  }

  async function updateStudentEmploy(data) {
    return call({ action: 'updateStudentEmploy', token: ADMIN_TOKEN, ...data });
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
    return call({ action: 'addDept', token: ADMIN_TOKEN, ...data });
  }

  async function deleteDept(name) {
    _cDel('depts', _yearKey());
    return call({ action: 'deleteDept', token: ADMIN_TOKEN, name });
  }

  async function updateDept(oldName, newName, year) {
    _cDel('depts', _yearKey());
    return call({ action: 'updateDept', token: ADMIN_TOKEN, oldName, newName, year });
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
    _cDel('banners', _yearKey());
    return call({ action: 'addBanner', token: ADMIN_TOKEN, ...data });
  }

  async function deleteBanner(id) {
    _cDel('banners', _yearKey());
    return call({ action: 'deleteBanner', token: ADMIN_TOKEN, id });
  }

  async function updateBanner(data) {
    _cDel('banners', _yearKey());
    return call({ action: 'updateBanner', token: ADMIN_TOKEN, ...data });
  }

  // ════════════════════════════════════════════
  // 취업통계
  // ════════════════════════════════════════════
  async function verifyAdminPw(pw) {
    return call({ action: 'verifyAdminPw', pw });
  }

  async function getStats() {
    return get({ action: 'getStats' });
  }

  async function getEmployStats(year) {
    const k = 'employ_'+(year||new Date().getFullYear());
    const c = _cGet(k); if (c) return c;
    const r = await get({ action: 'getEmployStats', year: year || new Date().getFullYear() });
    if (r.success) _cSet(k, r, _TTL.depts);
    return r;
  }

  async function saveEmployStats(year, data) {
    _cDel('employ_'+year, _yearKey());
    return call({ action: 'saveEmployStats', token: ADMIN_TOKEN, year, data: JSON.stringify(data) });
  }

  async function saveAnnualStat(data) {
    return call({ action: 'saveAnnualStat', token: ADMIN_TOKEN, ...data });
  }

  async function deleteAnnualStat(year) {
    return call({ action: 'deleteAnnualStat', token: ADMIN_TOKEN, year });
  }

  async function saveEmploy(data) {
    return call({ action: 'saveEmploy', token: ADMIN_TOKEN, ...data });
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
    return call({ action: 'addReview', token: ADMIN_TOKEN,
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
    return call({ action: 'deleteReview', token: ADMIN_TOKEN, id });
  }

  async function uploadFile(name, base64, mimeType) {
    return call({ action: 'uploadFileToDrive', token: ADMIN_TOKEN, name, base64, mimeType: mimeType || 'application/octet-stream' });
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
    return call({ action: 'addPracticeSection', token: ADMIN_TOKEN, ...data });
  }
  async function updatePracticeSection(data) {
    _cDel('prSec', 'prFiles');
    return call({ action: 'updatePracticeSection', token: ADMIN_TOKEN, ...data });
  }
  async function deletePracticeSection(id) {
    _cDel('prSec', 'prFiles');
    return call({ action: 'deletePracticeSection', token: ADMIN_TOKEN, id });
  }
  async function reorderPracticeSection(orders) {
    _cDel('prSec');
    return call({ action: 'reorderPracticeSection', token: ADMIN_TOKEN, orders: JSON.stringify(orders) });
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
    return call({ action: 'addPracticeFile', token: ADMIN_TOKEN, ...data });
  }
  async function updatePracticeFile(data) {
    _cDel('prFiles');
    return call({ action: 'updatePracticeFile', token: ADMIN_TOKEN, ...data });
  }
  async function deletePracticeFile(id) {
    _cDel('prFiles');
    return call({ action: 'deletePracticeFile', token: ADMIN_TOKEN, id });
  }
  async function reorderPracticeFile(orders) {
    _cDel('prFiles');
    return call({ action: 'reorderPracticeFile', token: ADMIN_TOKEN, orders: JSON.stringify(orders) });
  }

  // ════════════════════════════════════════════
  // 현장실습 Q&A
  // ════════════════════════════════════════════
  function _qnaAuth() {
    // 교사 인증 정보: sessionStorage에서 읽어 전달
    const teacherId = sessionStorage.getItem('samilTeacherAuth') || sessionStorage.getItem('samilNonHomeTeacherAuth') || '';
    const studentId = sessionStorage.getItem('samilStudentAuth') || '';
    return { teacherId, studentId };
  }

  async function getQnAs(category) {
    const auth = _qnaAuth();
    const isAdm = sessionStorage.getItem('samilAdminAuth') === '1';
    const p = { action: 'getQnAs', ...auth };
    if (isAdm) p.token = ADMIN_TOKEN;
    if (category) p.category = category;
    return call(p);
  }

  async function addQnA(data) {
    _cDel('qna');
    const auth  = _qnaAuth();
    const isAdm = sessionStorage.getItem('samilAdminAuth') === '1';
    let me = {};
    try { me = JSON.parse(sessionStorage.getItem('samilTeacherME') || sessionStorage.getItem('samilNonHomeTeacherME') || '{}'); } catch(_) {}
    const p = { action: 'addQnA', ...auth, author: me.name || (isAdm ? '관리자' : '교사'), ...data };
    if (isAdm) p.token = ADMIN_TOKEN;
    return call(p);
  }

  async function addQnAAnswer(data) {
    _cDel('qna');
    const auth  = _qnaAuth();
    const isAdm = sessionStorage.getItem('samilAdminAuth') === '1';
    let me = {};
    try { me = JSON.parse(sessionStorage.getItem('samilTeacherME') || sessionStorage.getItem('samilNonHomeTeacherME') || sessionStorage.getItem('samilStudentME') || '{}'); } catch(_) {}
    const p = { action: 'addQnAAnswer', ...auth, author: me.name || (isAdm ? '관리자' : auth.teacherId ? '교사' : '학생'), ...data };
    if (isAdm) p.token = ADMIN_TOKEN;
    return call(p);
  }

  async function deleteQnA(id) {
    _cDel('qna');
    return call({ action: 'deleteQnA', token: ADMIN_TOKEN, id });
  }

  async function markAnswered(id) {
    _cDel('qna');
    return call({ action: 'markAnswered', token: ADMIN_TOKEN, id });
  }

  async function uploadQnAFile(name, base64, mimeType) {
    const auth  = _qnaAuth();
    const isAdm = sessionStorage.getItem('samilAdminAuth') === '1';
    const p = { action: 'uploadQnAFile', ...auth, name, base64, mimeType: mimeType || 'application/octet-stream' };
    if (isAdm) p.token = ADMIN_TOKEN;
    return call(p);
  }

  // ════════════════════════════════════════════
  // 현장실습소위원회 (조회: 로그인 사용자 / 쓰기: 관리자 전용)
  // ════════════════════════════════════════════
  async function getCommittee() {
    const c = _cGet('committee'); if (c) return c;
    const r = await get({ action: 'getCommittee' });
    if (r.success) _cSet('committee', r, 300000);
    return r;
  }
  async function addCommittee(data) {
    _cDel('committee');
    return call({ action: 'addCommittee', token: ADMIN_TOKEN, ...data });
  }
  async function updateCommittee(data) {
    _cDel('committee');
    return call({ action: 'updateCommittee', token: ADMIN_TOKEN, ...data });
  }
  async function deleteCommittee(id) {
    _cDel('committee');
    return call({ action: 'deleteCommittee', token: ADMIN_TOKEN, id });
  }

  // ════════════════════════════════════════════
  // 현장실습 안내사항 메모 (조회: 로그인 사용자 / 쓰기: 관리자 전용)
  // ════════════════════════════════════════════
  async function getNotices() {
    const c = _cGet('notices'); if (c) return c;
    const r = await get({ action: 'getNotices' });
    if (r.success) _cSet('notices', r, 300000);
    return r;
  }
  async function addNotice(data) {
    _cDel('notices');
    return call({ action: 'addNotice', token: ADMIN_TOKEN, ...data });
  }
  async function updateNotice(data) {
    _cDel('notices');
    return call({ action: 'updateNotice', token: ADMIN_TOKEN, ...data });
  }
  async function deleteNotice(id) {
    _cDel('notices');
    return call({ action: 'deleteNotice', token: ADMIN_TOKEN, id });
  }

  // ════════════════════════════════════════════
  // 시트 초기화
  // ════════════════════════════════════════════
  async function initSheets() {
    return call({ action: 'initSheets', token: ADMIN_TOKEN });
  }

  // ════════════════════════════════════════════
  // 프로그램 다운로드 관리 (관리자 전용)
  // ════════════════════════════════════════════
  function getPrograms() {
    return call({ action: 'getPrograms' });
  }
  function addProgram(name, version, desc, url) {
    return call({ action: 'addProgram', token: ADMIN_TOKEN, name, version, desc, url });
  }
  function deleteProgram(id) {
    return call({ action: 'deleteProgram', token: ADMIN_TOKEN, id });
  }

  return {
    getAll,
    getJobs, addJob, updateJob, deleteJob, toggleJob,
    getJobStats, incrementView,
    loginStudent, getStudents, getMyRecord, saveRecord, saveRecords, addStudent, resetStudentPw,
    loginTeacher, addTeacher, deleteTeacher, updateTeacher, changeTeacherPw, changeStudentPw,
    loginNonHomeTeacher, getNonHomeTeachers, addNonHomeTeacher, deleteNonHomeTeacher, updateNonHomeTeacher, changeNonHomeTeacherPw,
    getTeachers, getClasses, saveClasses,
    updateStudentEmploy,
    getDepts, addDept, deleteDept, updateDept,
    getStudentCountByClass,
    getYears, addYear, deleteYear,
    verifyAdminPw,
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
    getQnAs, addQnA, addQnAAnswer, deleteQnA, markAnswered, uploadQnAFile,
    getCommittee, addCommittee, updateCommittee, deleteCommittee,
    getNotices, addNotice, updateNotice, deleteNotice,
    getPrograms, addProgram, deleteProgram,
    initSheets,
  };
})();
