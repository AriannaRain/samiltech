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

  async function addJob(data) {
    return call({ action: 'addJob', token: ADMIN_TOKEN, ...flattenJob(data) });
  }

  async function updateJob(id, data) {
    return call({ action: 'updateJob', token: ADMIN_TOKEN, id, ...flattenJob(data) });
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

  async function applyJob(data)         { return call({ action: 'applyJob',       ...data }); }
  async function applyJobs(data)        { return call({ action: 'applyJobs',      ...data }); }
  async function getApplicants(data)    { return call({ action: 'getApplicants',  ...data }); }
  async function deleteApply(data)      { return call({ action: 'deleteApply',    ...data }); }
  async function toggleInterest(data)   { return call({ action: 'toggleInterest', ...data }); }
  async function getInterested(data)    { return call({ action: 'getInterested',  token: ADMIN_TOKEN, ...data }); }
  async function getMyInterests(data)   { return call({ action: 'getMyInterests', ...data }); }

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

  // ════════════════════════════════════════════
  // 시트 초기화
  // ════════════════════════════════════════════
  async function initSheets() {
    return call({ action: 'initSheets', token: ADMIN_TOKEN });
  }

  return {
    getJobs, addJob, updateJob, deleteJob, toggleJob,
    loginStudent, getStudents, getMyRecord, saveRecord, saveRecords, addStudent, resetStudentPw,
    loginTeacher, addTeacher, deleteTeacher, changeTeacherPw, changeStudentPw,
    getDepts, addDept, deleteDept,
    getBanners, addBanner, deleteBanner,
    getStats, saveAnnualStat, deleteAnnualStat, saveEmploy,
    getArchive,
    applyJob, applyJobs, getApplicants, deleteApply,
    toggleInterest, getInterested, getMyInterests,
    initSheets,
  };
})();
