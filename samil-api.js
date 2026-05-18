/**
 * samil-api.js  —  Google Apps Script API 레이어
 */

const SAMIL_API = (() => {
  const GAS_URL     = 'https://script.google.com/macros/s/AKfycby6UpyOV0rxKOUbQkerpniceHPAgZOkLfNKJC5JFyEJqxmJbe_4BcK-HOPCHOmahnnA_g/exec';
  const ADMIN_TOKEN = 'samil_admin_2024';

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
    return get({ action: 'getJobs', activeOnly });
  }

  // ════════════════════════════════════════════
  // 배치 (Cold Start 최소화)
  // ════════════════════════════════════════════
  async function getAll(year) {
    return get({ action: 'getAll', year: year || new Date().getFullYear() });
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
    return call({ action: 'addJob', token: ADMIN_TOKEN, ...flattenJob(data) });
  }

  async function updateJob(data) {
    return call({ action: 'updateJob', token: ADMIN_TOKEN, id: data.id, ...flattenJob(data) });
  }

  async function deleteJob(id) {
    return call({ action: 'deleteJob', token: ADMIN_TOKEN, id });
  }

  async function toggleJob(id) {
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

  async function changeTeacherPw(data) {
    return call({ action: 'changeTeacherPw', ...data });
  }

  async function changeStudentPw(data) {
    return call({ action: 'changeStudentPw', ...data });
  }

  async function addTeacher(data) {
    return call({ action: 'addTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function deleteTeacher(data) {
    return call({ action: 'deleteTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function updateTeacher(data) {
    return call({ action: 'updateTeacher', token: ADMIN_TOKEN, ...data });
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
    return get({ action: 'getTeachers', ...opts });
  }

  async function getClasses(opts = {}) {
    return get({ action: 'getClasses', ...opts });
  }

  async function saveClasses(data) {
    return call({ action: 'saveClasses', token: ADMIN_TOKEN, ...data });
  }

  async function updateStudentEmploy(data) {
    return call({ action: 'updateStudentEmploy', token: ADMIN_TOKEN, ...data });
  }

  // ════════════════════════════════════════════
  // 학과
  // ════════════════════════════════════════════
  async function getDepts() {
    return get({ action: 'getDepts' });
  }

  async function addDept(data) {
    return call({ action: 'addDept', token: ADMIN_TOKEN, ...data });
  }

  async function deleteDept(name) {
    return call({ action: 'deleteDept', token: ADMIN_TOKEN, name });
  }

  async function updateDept(oldName, newName, year) {
    return call({ action: 'updateDept', token: ADMIN_TOKEN, oldName, newName, year });
  }

  async function getStudentCountByClass(year) {
    return get({ action: 'getStudentCountByClass', year });
  }

  // ════════════════════════════════════════════
  // 배너
  // ════════════════════════════════════════════
  async function getBanners() {
    return get({ action: 'getBanners' });
  }

  async function addBanner(data) {
    return call({ action: 'addBanner', token: ADMIN_TOKEN, ...data });
  }

  async function deleteBanner(id) {
    return call({ action: 'deleteBanner', token: ADMIN_TOKEN, id });
  }

  async function updateBanner(data) {
    return call({ action: 'updateBanner', token: ADMIN_TOKEN, ...data });
  }

  // ════════════════════════════════════════════
  // 취업통계
  // ════════════════════════════════════════════
  async function getStats() {
    return get({ action: 'getStats' });
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
    return get({ action: 'getReviews', dept });
  }

  async function addReview(data) {
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
    return call({ action: 'deleteReview', token: ADMIN_TOKEN, id });
  }

  async function uploadFile(name, base64, mimeType) {
    return call({ action: 'uploadFileToDrive', token: ADMIN_TOKEN, name, base64, mimeType: mimeType || 'application/octet-stream' });
  }

  // ════════════════════════════════════════════
  // 시트 초기화
  // ════════════════════════════════════════════
  async function initSheets() {
    return call({ action: 'initSheets', token: ADMIN_TOKEN });
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
    getBanners, addBanner, deleteBanner, updateBanner,
    getStats, saveAnnualStat, deleteAnnualStat, saveEmploy,
    getArchive, getReviews, addReview, deleteReview,
    applyJob, applyJobs, getApplicants, deleteApply,
    toggleInterest, getInterested, getMyInterests,
    uploadFile,
    initSheets,
  };
})();
