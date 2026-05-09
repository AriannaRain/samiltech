/**
 * samil-api.js  —  Google Apps Script API 레이어
 *
 * 사용법: 각 HTML 파일에 <script src="samil-api.js"></script> 추가
 *        또는 <script> 블록 상단에 인라인 삽입
 *
 * GAS_URL = 배포 후 받은 웹 앱 URL로 교체
 */

const SAMIL_API = (() => {
  // ★ 배포 후 이 URL을 교체하세요
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyiYRU7nq8CrBAu_oJLPbIyLcMOxV_rPhOHDGUgF9hVupXcH-__P47S25ouLd9Srs8c/exec';
  const ADMIN_TOKEN = 'samil_admin_2024';  // Code.gs와 동일하게

  // ── 내부 fetch 래퍼 ──
  async function call(params) {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },  // GAS CORS 우회
        body: JSON.stringify(params),
        redirect: 'follow',
      });
      const json = await res.json();
      return json;
    } catch (e) {
      console.error('[SAMIL_API]', e);
      return { success: false, error: e.message };
    }
  }

  // ── GET 방식 (CORS 캐시 활용) ──
  async function get(params) {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${GAS_URL}?${qs}`, { redirect: 'follow' });
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
      co: d.co, job: d.job, loc: d.loc, cnt: d.cnt, dl: d.dl,
      type: d.type || '기타',
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
    // opts: { teacherId, dept, adminMode }
    const params = { action: 'getStudents', ...opts };
    if (opts.adminMode) params.token = ADMIN_TOKEN;
    return call(params);
  }

  async function getMyRecord(studentId) {
    return call({ action: 'getMyRecord', studentId });
  }

  async function saveRecord(record, teacherId) {
    return call({
      action: 'saveRecord',
      teacherId,
      record: JSON.stringify(record),
    });
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

  async function addTeacher(data) {
    // data: { dept, grade, cls, name, pw, year }
    return call({ action: 'addTeacher', token: ADMIN_TOKEN, ...data });
  }

  async function deleteTeacher(data) {
    return call({ action: 'deleteTeacher', token: ADMIN_TOKEN, ...data });
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
    // data: { year, grad, employed, rate }
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
  // 시트 초기화 (최초 1회)
  // ════════════════════════════════════════════
  async function initSheets() {
    return call({ action: 'initSheets', token: ADMIN_TOKEN });
  }

  return {
    getJobs, addJob, updateJob, deleteJob, toggleJob,
    loginStudent, getStudents, getMyRecord, saveRecord, addStudent, resetStudentPw,
    loginTeacher, addTeacher, deleteTeacher,
    getDepts, addDept, deleteDept,
    getBanners, addBanner, deleteBanner,
    getStats, saveAnnualStat, deleteAnnualStat, saveEmploy,
    getArchive,
    initSheets,
  };
})();
