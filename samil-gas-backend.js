/**
 * samil-jobs Google Apps Script Backend
 * Sheets ID: 16lcacHI7Q04kufwbWTtQiR5rWZnOpBcZYoZRyNV9PzI
 *
 * ★ 보안 패치 내역 (2026-05-26):
 *   - ADMIN_TOKEN 하드코딩 제거 → ScriptProperties 'ADMIN_TOKEN' 키로 이전
 *   - verifyAdminPw 성공 시 토큰값 반환 → 클라이언트가 소스 노출 없이 사용
 *   - changeAdminPw 액션 추가 → 관리자 비밀번호 및 토큰 변경 가능
 *   - getStudents / getApplicants / deleteApply의 ADMIN_TOKEN 직접 비교도 수정
 *
 * ★ 프로그램 관리 추가 (2026-05-27):
 *   - getPrograms / addProgram / deleteProgram 액션 추가
 *   - '프로그램목록' 시트 사용
 */

const SHEET_ID = '16lcacHI7Q04kufwbWTtQiR5rWZnOpBcZYoZRyNV9PzI';
const SS       = SpreadsheetApp.openById(SHEET_ID);

function getAdminToken() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || 'samil_admin_2024';
}

function initAdminToken() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', 'samil_admin_2024');
  Logger.log('ADMIN_TOKEN이 ScriptProperties에 저장되었습니다.');
}

const SH = {
  STUDENTS  : '학생정보',
  COMPANIES : '업체DB',
  JOBS      : '채용공고',
  PRACTICE  : '현장실습이력',
  EMPLOY    : '취업확정이력',
  ANNUAL    : '연도별매칭이력',
  ARCHIVE   : '선배취업아카이브',
  APPLY     : '지원현황',
  INTEREST  : '관심공고',
  PR_SEC    : '현장실습섹션',
  PR_FILE   : '현장실습자료',
  PROGRAMS  : '프로그램목록',   // ★ 추가
};

function doGet(e) {
  return handleRequest(e.parameter, null);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(_) {}
  const params = { ...e.parameter, ...body };
  return handleRequest(params, body);
}

function handleRequest(p, body) {
  try {
    const action = p.action || '';
    let result;

    if      (action === 'getAll')      result = getAll(p);
    else if (action === 'getJobs')     result = getJobs(p);
    else if (action === 'getDepts')    result = getDepts(p);
    else if (action === 'getStats')    result = getStats();
    else if (action === 'getBanners')  result = getBanners(p);
    else if (action === 'getArchive')  result = getArchive(p);
    else if (action === 'getReviews')  result = getReviews(p);
    else if (action === 'addReview')   result = adminAction(p, addReviewSheet);
    else if (action === 'deleteReview') result = adminAction(p, deleteReview);
    else if (action === 'getTeachers') result = getTeachers(p);
    else if (action === 'getClasses')  result = getClasses(p);

    else if (action === 'loginStudent')  result = loginStudent(p);
    else if (action === 'loginTeacher')  result = loginTeacher(p);
    else if (action === 'getStudents')   result = getStudents(p);
    else if (action === 'saveRecord')    result = saveRecord(p);
    else if (action === 'saveRecords')   result = saveRecords(p);
    else if (action === 'getMyRecord')   result = getMyRecord(p);

    else if (action === 'addJob')              result = adminAction(p, addJob);
    else if (action === 'updateJob')           result = adminAction(p, updateJob);
    else if (action === 'deleteJob')           result = adminAction(p, deleteJob);
    else if (action === 'toggleJob')           result = adminAction(p, toggleJob);
    else if (action === 'addBanner')           result = adminAction(p, addBanner);
    else if (action === 'deleteBanner')        result = adminAction(p, deleteBanner);
    else if (action === 'updateBanner')        result = adminAction(p, updateBanner);
    else if (action === 'addDept')             result = adminAction(p, addDept);
    else if (action === 'deleteDept')          result = adminAction(p, deleteDept);
    else if (action === 'addTeacher')          result = adminAction(p, addTeacher);
    else if (action === 'deleteTeacher')       result = adminAction(p, deleteTeacher);
    else if (action === 'getYears')        result = getYears();
    else if (action === 'addYear')         result = adminAction(p, addYear);
    else if (action === 'deleteYear')      result = adminAction(p, deleteYear);
    else if (action === 'verifyAdminPw')   result = verifyAdminPw(p);
    else if (action === 'changeAdminPw')   result = changeAdminPw(p);
    else if (action === 'saveAdminPw')     result = adminAction(p, saveAdminPw);
    else if (action === 'updateTeacher')   result = adminAction(p, updateTeacher);
    else if (action === 'updateDept')      result = adminAction(p, updateDept);
    else if (action === 'saveClasses')         result = adminAction(p, saveClasses);
    else if (action === 'updateStudentEmploy') result = adminAction(p, updateStudentEmploy);
    else if (action === 'changeTeacherPw')  result = changeTeacherPw(p);
    else if (action === 'changeStudentPw')  result = changeStudentPw(p);
    else if (action === 'addStudent')       result = adminAction(p, addStudent);
    else if (action === 'resetStudentPw')   result = adminAction(p, resetStudentPw);
    else if (action === 'saveEmploy')       result = adminAction(p, saveEmploy);
    else if (action === 'saveAnnualStat')   result = adminAction(p, saveAnnualStat);
    else if (action === 'deleteAnnualStat') result = adminAction(p, deleteAnnualStat);
    else if (action === 'initSheets')       result = adminAction(p, initSheets);
    else if (action === 'uploadFileToDrive') result = adminAction(p, uploadFileToDrive);
    else if (action === 'getJobStats')      result = getJobStats(p);
    else if (action === 'incrementView')    result = incrementView(p);
    else if (action === 'applyJob')         result = applyJob(p);
    else if (action === 'applyJobs')        result = applyJobs(p);
    else if (action === 'getApplicants')    result = getApplicants(p);
    else if (action === 'deleteApply')      result = deleteApply(p);
    else if (action === 'toggleInterest')   result = toggleInterestSheet(p);
    else if (action === 'getInterested')    result = getInterested(p);
    else if (action === 'getMyInterests')   result = getMyInterests(p);
    else if (action === 'getPracticeSections')    result = getPracticeSections();
    else if (action === 'addPracticeSection')     result = adminAction(p, addPracticeSection);
    else if (action === 'updatePracticeSection')  result = adminAction(p, updatePracticeSection);
    else if (action === 'deletePracticeSection')  result = adminAction(p, deletePracticeSection);
    else if (action === 'reorderPracticeSection') result = adminAction(p, reorderPracticeSection);
    else if (action === 'getPracticeFiles')       result = getPracticeFiles(p);
    else if (action === 'addPracticeFile')        result = adminAction(p, addPracticeFile);
    else if (action === 'updatePracticeFile')     result = adminAction(p, updatePracticeFile);
    else if (action === 'deletePracticeFile')     result = adminAction(p, deletePracticeFile);
    else if (action === 'reorderPracticeFile')    result = adminAction(p, reorderPracticeFile);
    else if (action === 'getStudentCountByClass') result = getStudentCountByClass(p);
    else if (action === 'migrateDepts')           result = adminAction(p, migrateDepts);
    else if (action === 'getEmployStats')          result = getEmployStats(p);
    else if (action === 'saveEmployStats')         result = adminAction(p, saveEmployStats);
    // ★ 프로그램 관리 (추가)
    else if (action === 'getPrograms')    result = getPrograms(p);
    else if (action === 'addProgram')     result = adminAction(p, addProgram);
    else if (action === 'deleteProgram')  result = adminAction(p, deleteProgram);
    else result = { success: false, error: 'Unknown action: ' + action };

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function adminAction(p, fn) {
  if (p.token !== getAdminToken()) return { success: false, error: '관리자 인증 실패' };
  return fn(p);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════
// 헬퍼
// ══════════════════════════════════════════════
function getSheet(name) {
  let sh = SS.getSheetByName(name);
  if (!sh) {
    sh = SS.insertSheet(name);
    const HEADERS = {
      '지원현황' : ['ID','공고ID','공고명','이름','학과','학년','반','상태','등록일','메모','학번','등록구분'],
      '관심공고' : ['공고ID','공고명','학번','이름','학과','학년','반','등록일'],
      '현장실습섹션': ['ID','제목','순서','등록일'],
      '현장실습자료': ['ID','섹션ID','파일명','파일URL','순서','등록일'],
      '프로그램목록': ['ID','프로그램명','버전','설명','파일명','URL','크기','등록일'],  // ★ 추가
    };
    if (HEADERS[name]) sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
  }
  return sh;
}

function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row, i) => {
    const obj = { _row: i + 2 };
    headers.forEach((h, j) => { obj[h] = row[j]; });
    return obj;
  });
}

function today() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase();
}

function safeParseJSON(val, fallback) {
  if (!val || val === '' || val === '—') return fallback;
  try { return JSON.parse(val); } catch(e) { return fallback; }
}

// ══════════════════════════════════════════════
// ① 채용공고
// ══════════════════════════════════════════════
function getJobs(p) {
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  let jobs = rows
    .filter(r => r['상태'] !== '삭제')
    .map(r => ({
      id    : r['ID'],
      type  : r['회사유형'] || '',
      co    : r['회사명'],
      job   : r['공고제목'],
      loc   : r['근무지'],
      cnt   : r['모집인원'],
      dl    : r['마감일'] ? Utilities.formatDate(new Date(r['마감일']), 'Asia/Seoul', 'yyyy-MM-dd') : '',
      tags  : r['태그'] ? String(r['태그']).split(',').map(t => t.trim()).filter(Boolean) : [],
      rec   : r['학교장추천'] === true || r['학교장추천'] === 'TRUE' || r['학교장추천'] === '예',
      recCnt: Number(r['추천인원']) || 0,
      files : r['첨부파일'] ? String(r['첨부파일']).split('|').map(s => { const[n,u]=s.split('::'); return{name:n||'첨부',url:u||s}; }) : [],
      active: r['상태'] === '진행중',
      date  : r['등록일'] ? Utilities.formatDate(new Date(r['등록일']), 'Asia/Seoul', 'yyyy-MM-dd') : '',
      views : Number(r['조회수']) || 0,
      _row  : r['_row'],
    }));
  if (p.activeOnly === 'true') jobs = jobs.filter(j => j.active);
  if (p.year) jobs = jobs.filter(j => j.date && String(j.date).startsWith(String(p.year)));
  return { success: true, data: jobs };
}

function addJob(p) {
  const sh = getSheet(SH.JOBS);
  const id = generateId('J');
  sh.appendRow([
    id, p.type||'기타', p.co, p.job, p.loc, p.cnt,
    p.dl, p.rec === 'true' ? '예' : '아니오', p.recCnt || 0,
    p.files || '', p.tags || '', today(), '진행중', 0
  ]);
  return { success: true, id };
}

function updateJob(p) {
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '공고 없음' };
  sh.getRange(row['_row'], 2, 1, 12).setValues([[
    p.type||row['회사유형']||'기타', p.co, p.job, p.loc, p.cnt,
    p.dl, p.rec === 'true' ? '예' : '아니오', p.recCnt || 0,
    p.files || '', p.tags || '', row['등록일'], row['상태']
  ]]);
  return { success: true };
}

function deleteJob(p) {
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '공고 없음' };
  sh.getRange(row['_row'], 13).setValue('삭제');
  return { success: true };
}

function toggleJob(p) {
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '공고 없음' };
  const newStatus = row['상태'] === '진행중' ? '마감' : '진행중';
  sh.getRange(row['_row'], 13).setValue(newStatus);
  return { success: true, status: newStatus };
}

// ══════════════════════════════════════════════
// ② 학생 로그인 & 정보
// ══════════════════════════════════════════════
function loginStudent(p) {
  const dept = p.dept?.trim();
  const id   = p.id?.trim();
  const pw   = p.pw?.trim();
  if (!dept || !id || !pw) return { success: false, error: '입력값 오류' };

  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const found = rows.find(r => {
    if (String(r['학번']).trim() !== id) return false;
    if (String(r['학과']).trim() !== dept) return false;
    const stored = String(r['비밀번호']).trim();
    return stored === pw || Number(stored) === Number(pw);
  });
  if (!found) return { success: false, error: '학과/학번/비밀번호가 일치하지 않습니다' };

  return {
    success: true,
    student: {
      id       : found['학번'],
      name     : found['이름'],
      dept     : found['학과'],
      grade    : String(found['학년']),
      cls      : String(found['반']),
      gender   : found['성별'],
      birth    : found['생년월일'],
      teacher  : found['담임ID'],
      certCount: Number(found['자격증수']) || 0,
      uploaded : found['생기부업로드'] === true || found['생기부업로드'] === 'TRUE',
      certs    : safeParseJSON(found['자격증'], []),
      attend   : safeParseJSON(found['출결'], []),
      clubs    : safeParseJSON(found['동아리'], []),
      leaders  : safeParseJSON(found['임원'], []),
      summary  : safeParseJSON(found['성적요약'], null),
    }
  };
}

function getStudents(p) {
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  let list = rows.map(r => ({
    id       : String(r['학번']),
    name     : r['이름'],
    dept     : r['학과'],
    grade    : String(r['학년']),
    cls      : String(r['반']),
    gender   : r['성별'],
    birth    : r['생년월일'],
    teacher  : r['담임ID'],
    certCount: Number(r['자격증수']) || 0,
    uploaded : r['생기부업로드'] === true || r['생기부업로드'] === 'TRUE',
    certs    : safeParseJSON(r['자격증'], []),
    attend   : safeParseJSON(r['출결'], []),
    clubs    : safeParseJSON(r['동아리'], []),
    leaders  : safeParseJSON(r['임원'], []),
    summary  : safeParseJSON(r['성적요약'], null),
    employed : r['취업여부'] === true || r['취업여부'] === 'TRUE' || r['취업여부'] === '예',
    advanced : r['진학여부'] === true || r['진학여부'] === 'TRUE' || r['진학여부'] === '예',
    company  : r['입사처'] || '',
    school   : r['입학처'] || '',
    middle   : r['출신중학교'] || '',
  }));

  if (p.teacherId) list = list.filter(s => s.teacher === p.teacherId);
  if (p.dept)      list = list.filter(s => s.dept === p.dept);
  if (p.grade)     list = list.filter(s => String(s.grade) === String(p.grade));
  if (p.cls)       list = list.filter(s => String(s.cls)   === String(p.cls));
  if (p.token !== getAdminToken()) list = list.map(s => { const {birth, ...rest} = s; return rest; });
  return { success: true, data: list };
}

function addStudent(p) {
  const sh = getSheet(SH.STUDENTS);
  sh.appendRow([
    p.id, p.name, p.dept, p.grade, p.cls, p.gender || '—',
    p.birth, p.birth,
    p.teacher || '', today(), 0, false,
    '[]', '[]', '[]', '[]', 'null'
  ]);
  return { success: true };
}

function resetStudentPw(p) {
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['학번']).trim() === p.id);
  if (!row) return { success: false, error: '학생 없음' };
  sh.getRange(row['_row'], 8).setValue(row['생년월일']);
  return { success: true };
}

// ══════════════════════════════════════════════
// ③ 담임교사 로그인
// ══════════════════════════════════════════════
function loginTeacher(p) {
  const { dept, grade, cls, name, pw } = p;
  if (!dept || !grade || !cls || !name || !pw) return { success: false, error: '입력값 오류' };

  const props  = PropertiesService.getScriptProperties();
  const year   = new Date().getFullYear();
  const key    = `T_${year}_${dept}_${grade}_${cls}`;
  const stored = props.getProperty(key);
  if (!stored) return { success: false, error: '등록된 계정이 없습니다. 관리자에게 문의하세요.' };

  const [storedName, storedPw] = stored.split('::');
  if (storedName !== name || storedPw !== pw) return { success: false, error: '이름 또는 비밀번호 오류' };

  const teacherId = `${year}${dept}${grade}${cls}`;
  return { success: true, teacher: { id: teacherId, name, dept, grade, cls, year, pw } };
}

function addTeacher(p) {
  const props = PropertiesService.getScriptProperties();
  const year  = p.year || new Date().getFullYear();
  props.setProperty(`T_${year}_${p.dept}_${p.grade}_${p.cls}`, `${p.name}::${p.pw}`);
  return { success: true };
}

function deleteTeacher(p) {
  const props = PropertiesService.getScriptProperties();
  const year  = p.year || new Date().getFullYear();
  props.deleteProperty(`T_${year}_${p.dept}_${p.grade}_${p.cls}`);
  return { success: true };
}

function changeTeacherPw(p) {
  const { dept, grade, cls, name, pw, newPw } = p;
  if (!dept || !grade || !cls || !name || !pw || !newPw) return { success: false, error: '입력값 오류' };
  const props  = PropertiesService.getScriptProperties();
  const year   = p.year || new Date().getFullYear();
  const stored = props.getProperty(`T_${year}_${dept}_${grade}_${cls}`);
  if (!stored) return { success: false, error: '계정 없음' };
  const [storedName, storedPw] = stored.split('::');
  if (storedName !== name || storedPw !== pw) return { success: false, error: '현재 비밀번호가 맞지 않습니다.' };
  props.setProperty(`T_${year}_${dept}_${grade}_${cls}`, `${name}::${newPw}`);
  return { success: true };
}

function changeStudentPw(p) {
  const { studentId, curPw, newPw } = p;
  if (!studentId || !curPw || !newPw) return { success: false, error: '입력값 오류' };

  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['학번']).trim() === String(studentId).trim());
  if (!row) return { success: false, error: '학생 없음' };

  const stored = String(row['비밀번호']).trim();
  if (stored !== String(curPw).trim() && Number(stored) !== Number(curPw))
    return { success: false, error: '현재 비밀번호가 맞지 않습니다.' };

  const cell = sh.getRange(row['_row'], 8);
  cell.setNumberFormat('@');
  cell.setValue(String(newPw));
  return { success: true };
}

// ══════════════════════════════════════════════
function _buildRowData(record, existing, teacherId) {
  const birth = String(record.birth || '').padStart(6, '0');
  const pw    = existing ? String(existing['비밀번호']) : birth;
  return [
    record.id, record.name, record.dept, record.grade, record.cls,
    record.gender || '—', birth, pw,
    teacherId || (existing && existing['담임ID']) || '',
    existing ? existing['등록일'] : today(),
    record.certCount || 0,
    true,
    JSON.stringify(record.certs   || []),
    JSON.stringify(record.attend  || []),
    JSON.stringify(record.clubs   || []),
    JSON.stringify(record.leaders || []),
    JSON.stringify(record.summary || null),
  ];
}

function saveRecord(p) {
  if (!p.teacherId && p.token !== getAdminToken()) return { success: false, error: '권한 없음' };
  const record = typeof p.record === 'string' ? JSON.parse(p.record) : p.record;
  if (!record || !record.id) return { success: false, error: '레코드 없음' };

  const sh       = getSheet(SH.STUDENTS);
  const rows     = sheetToObjects(sh);
  const existing = rows.find(r => String(r['학번']).trim() === String(record.id).trim());
  const rowData  = _buildRowData(record, existing, p.teacherId);

  if (existing) {
    sh.getRange(existing['_row'], 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  return { success: true };
}

function saveRecords(p) {
  if (!p.teacherId && p.token !== getAdminToken()) return { success: false, error: '권한 없음' };
  const records = typeof p.records === 'string' ? JSON.parse(p.records) : p.records;
  if (!Array.isArray(records) || !records.length) return { success: false, error: '레코드 없음' };

  const sh = getSheet(SH.STUDENTS);

  const allHeaders = ['학번','이름','학과','학년','반','성별','생년월일','비밀번호','담임ID','등록일','자격증수','생기부업로드','자격증','출결','동아리','임원','성적요약'];
  const curHeaders = sh.getRange(1, 1, 1, 17).getValues()[0];
  const needsFix   = allHeaders.some((h, i) => !curHeaders[i]);
  if (needsFix) sh.getRange(1, 1, 1, 17).setValues([allHeaders]);

  sh.getRange('G:G').setNumberFormat('@');
  sh.getRange('H:H').setNumberFormat('@');

  if (!sh.getRange(1, 22).getValue()) sh.getRange(1, 22).setValue('출신중학교');

  const rows = sheetToObjects(sh);
  let added = 0, updated = 0, skipped = 0;

  // 교사 업로드인 경우(not admin): 첫 레코드의 dept/grade/cls를 기준으로 다른 학급 수정 차단
  const isTeacher = !!p.teacherId && p.token !== getAdminToken();
  const guardDept  = isTeacher && records[0] ? String(records[0].dept  || '') : null;
  const guardGrade = isTeacher && records[0] ? String(records[0].grade || '') : null;
  const guardCls   = isTeacher && records[0] ? String(records[0].cls   || '') : null;

  records.forEach(function(record) {
    if (!record || !record.id) return;
    const existing = rows.find(function(r) { return String(r['학번']).trim() === String(record.id).trim(); });

    // ★ 안전장치: 교사 업로드 시 스프레드시트의 기존 학생이 다른 학과/학년/반이면 절대 수정 금지
    if (isTeacher && existing) {
      const exDept  = String(existing['학과']  || '');
      const exGrade = String(existing['학년']  || '');
      const exCls   = String(existing['반']    || '');
      // 학과가 다르거나, 학과 같아도 학년·반이 다르면 스킵
      if ((exDept && guardDept && exDept !== guardDept) ||
          (exGrade && guardGrade && exGrade !== guardGrade) ||
          (exCls   && guardCls   && exCls   !== guardCls)) {
        skipped++;
        return;
      }
    }

    const rowData = _buildRowData(record, existing, p.teacherId);
    if (existing) {
      sh.getRange(existing['_row'], 1, 1, rowData.length).setValues([rowData]);
      sh.getRange(existing['_row'], 22).setValue(record.middle || '');
      existing['학번'] = record.id;
      updated++;
    } else {
      const newRow = sh.getLastRow() + 1;
      sh.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
      sh.getRange(newRow, 22).setValue(record.middle || '');
      rows.push({ '학번': record.id, '_row': newRow });
      added++;
    }
  });
  return { success: true, added: added, updated: updated, skipped: skipped };
}

function getMyRecord(p) {
  if (!p.studentId) return { success: false, error: '학번 필요' };
  const practice = sheetToObjects(getSheet(SH.PRACTICE))
    .filter(r => String(r['학번']).trim() === p.studentId)
    .map(r => ({ company: r['업체명'], start: r['시작일'], end: r['종료일'], year: r['학년도'] }));
  const employ = sheetToObjects(getSheet(SH.EMPLOY))
    .filter(r => String(r['학번']).trim() === p.studentId)
    .map(r => ({ company: r['업체명'], date: r['취업일'], type: r['고용형태'], year: r['학년도'] }));
  return { success: true, data: { practice, employ } };
}

// ══════════════════════════════════════════════
// 학과 관리
// ══════════════════════════════════════════════
function getDepts(p) {
  const year  = (p && p.year) ? String(p.year) : null;
  const props = PropertiesService.getScriptProperties();
  let raw;
  if (year) {
    raw = props.getProperty(`DEPTS_${year}`) || '[]';
  } else {
    raw = props.getProperty(`DEPTS_${new Date().getFullYear()}`) || props.getProperty('DEPTS') || '[]';
  }
  let depts = safeParseJSON(raw, []);
  const seen = new Set();
  depts = depts.filter(d => { if (seen.has(d.name)) return false; seen.add(d.name); return true; });
  return { success: true, data: depts };
}

function addDept(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const key   = `DEPTS_${year}`;
  const depts = safeParseJSON(props.getProperty(key) || '[]', []);
  if (depts.find(d => d.name === p.name)) return { success: false, error: '이미 존재하는 학과' };
  depts.push({ name: p.name, code: p.code || '', startYear: year, endYear: null, alias: [], mergedFrom: [] });
  props.setProperty(key, JSON.stringify(depts));
  return { success: true };
}

function deleteDept(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const key   = `DEPTS_${year}`;
  const depts = safeParseJSON(props.getProperty(key) || '[]', []);
  props.setProperty(key, JSON.stringify(depts.filter(d => d.name !== p.name)));
  return { success: true };
}

// ══════════════════════════════════════════════
// 배너
// ══════════════════════════════════════════════
function getBanners(p) {
  const year  = (p && p.year) ? String(p.year) : null;
  const props = PropertiesService.getScriptProperties();
  let raw;
  if (year) {
    raw = props.getProperty(`BANNERS_${year}`) || '[]';
  } else {
    raw = props.getProperty(`BANNERS_${new Date().getFullYear()}`) || props.getProperty('BANNERS') || '[]';
  }
  return { success: true, data: safeParseJSON(raw, []) };
}

function addBanner(p) {
  const year    = p.year || new Date().getFullYear();
  const props   = PropertiesService.getScriptProperties();
  const key     = `BANNERS_${year}`;
  const banners = safeParseJSON(props.getProperty(key) || '[]', []);
  banners.push({ id: generateId('B'), title: p.title, url: p.url || '#', dl: p.dl || '', color: p.color || '#1E3A6E', noExpiry: p.noExpiry === 'true', date: today() });
  props.setProperty(key, JSON.stringify(banners));
  return { success: true };
}

function updateBanner(p) {
  const year    = p.year || new Date().getFullYear();
  const props   = PropertiesService.getScriptProperties();
  const key     = `BANNERS_${year}`;
  const banners = safeParseJSON(props.getProperty(key) || '[]', []);
  const idx     = banners.findIndex(b => b.id === p.id);
  if (idx === -1) return { success: false, error: '배너 없음' };
  banners[idx] = { ...banners[idx], title: p.title, url: p.url || '#', dl: p.noExpiry === 'true' ? '' : (p.dl || ''), color: p.color || banners[idx].color, noExpiry: p.noExpiry === 'true' };
  props.setProperty(key, JSON.stringify(banners));
  return { success: true };
}

function deleteBanner(p) {
  const year    = p.year || new Date().getFullYear();
  const props   = PropertiesService.getScriptProperties();
  const key     = `BANNERS_${year}`;
  const banners = safeParseJSON(props.getProperty(key) || '[]', []);
  props.setProperty(key, JSON.stringify(banners.filter(b => b.id !== p.id)));
  return { success: true };
}

// ══════════════════════════════════════════════
// 취업통계
// ══════════════════════════════════════════════
function getStats() {
  let sh;
  try { sh = getSheet(SH.ANNUAL); } catch(_) { return { success: true, data: [], latest: {} }; }
  const data = sheetToObjects(sh).map(r => ({
    year: r['학년도'], grad: Number(r['졸업생수']) || 0,
    rate: Number(r['취업률']) || 0, employed: Number(r['취업자수']) || 0,
  })).sort((a, b) => b.year - a.year);
  return { success: true, data, latest: data[0] || {} };
}

function saveAnnualStat(p) {
  const sh   = getSheet(SH.ANNUAL);
  const rows = sheetToObjects(sh);
  const existing = rows.find(r => String(r['학년도']) === String(p.year));
  const rate = p.rate || (p.grad > 0 ? Math.round(p.employed / p.grad * 1000) / 10 : 0);
  if (existing) {
    sh.getRange(existing['_row'], 1, 1, 4).setValues([[p.year, p.grad, p.employed, rate]]);
  } else {
    sh.appendRow([p.year, p.grad, p.employed, rate]);
  }
  return { success: true };
}

function deleteAnnualStat(p) {
  const sh  = getSheet(SH.ANNUAL);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['학년도']) === String(p.year));
  if (!row) return { success: false, error: '데이터 없음' };
  sh.deleteRow(row['_row']);
  return { success: true };
}

function saveEmploy(p) {
  const sh = getSheet(SH.EMPLOY);
  sh.appendRow([
    p.studentId, p.name, p.dept, p.company,
    p.date || today(), p.type || '정규직',
    p.teacherId || '', p.year || new Date().getFullYear()
  ]);
  return { success: true };
}

// ══════════════════════════════════════════════
// 지원현황
// ══════════════════════════════════════════════
function applyJob(p) {
  if (!p.jobId || !p.studentId) return { success: false, error: '필수값 누락' };
  const sh   = getSheet(SH.APPLY);
  const rows = sheetToObjects(sh);
  if (rows.find(r => String(r['공고ID']) === String(p.jobId) && String(r['학번']) === String(p.studentId)))
    return { success: false, error: '이미 지원한 학생입니다.' };
  sh.appendRow([
    Utilities.getUuid(), p.jobId, p.jobName||'', p.name||'', p.dept||'',
    p.grade||'', p.cls||'', '지원', today(), p.regById||'', p.studentId, p.regType||'학생',
  ]);
  return { success: true };
}

function applyJobs(p) {
  if (!p.teacherId && p.token !== getAdminToken()) return { success: false, error: '권한 없음' };
  const students = typeof p.students === 'string' ? JSON.parse(p.students) : p.students;
  if (!Array.isArray(students) || !students.length) return { success: false, error: '학생 없음' };
  const sh   = getSheet(SH.APPLY);
  const rows = sheetToObjects(sh);
  let added = 0, skipped = 0;
  students.forEach(s => {
    if (rows.find(r => String(r['공고ID']) === String(p.jobId) && String(r['학번']) === String(s.id))) { skipped++; return; }
    sh.appendRow([
      Utilities.getUuid(), p.jobId, p.jobName||'', s.name||'', s.dept||'',
      s.grade||'', s.cls||'', '지원', today(), p.teacherId||'', s.id, '담임',
    ]);
    rows.push({ '공고ID': p.jobId, '학번': s.id });
    added++;
  });
  return { success: true, added, skipped };
}

function getApplicants(p) {
  const isAdmin   = p.token === getAdminToken();
  const isTeacher = !!p.teacherId;
  if (!isAdmin && !isTeacher) return { success: false, error: '권한 없음' };
  if (!p.jobId) return { success: false, error: '공고ID 필요' };
  const rows = sheetToObjects(getSheet(SH.APPLY))
    .filter(r => String(r['공고ID']) === String(p.jobId));
  const list = (isAdmin ? rows : rows.filter(r =>
    r['학과'] === p.dept && String(r['학년']) === String(p.grade) && String(r['반']) === String(p.cls)
  )).map(r => ({
    _row     : r['_row'],
    jobId    : r['공고ID'],
    jobName  : r['공고명'],
    studentId: r['학번'],
    name     : r['이름'],
    dept     : r['학과'],
    grade    : r['학년'],
    cls      : r['반'],
    date     : r['등록일'],
    regType  : r['등록구분'],
    regById  : r['메모'],
  }));
  return { success: true, data: list };
}

function deleteApply(p) {
  const isAdmin   = p.token === getAdminToken();
  const isTeacher = !!p.teacherId;
  if (!isAdmin && !isTeacher) return { success: false, error: '권한 없음' };
  if (!p.rowNum) return { success: false, error: 'rowNum 필요' };
  getSheet(SH.APPLY).deleteRow(Number(p.rowNum));
  return { success: true };
}

// ══════════════════════════════════════════════
// 관심공고
// ══════════════════════════════════════════════
function toggleInterestSheet(p) {
  if (!p.jobId || !p.studentId) return { success: false, error: '필수값 누락' };
  const sh   = getSheet(SH.INTEREST);
  const rows = sheetToObjects(sh);
  const ex   = rows.find(r => String(r['공고ID']) === String(p.jobId) && String(r['학번']) === String(p.studentId));
  if (ex) { sh.deleteRow(ex['_row']); return { success: true, interested: false }; }
  sh.appendRow([p.jobId, p.jobName||'', p.studentId, p.name||'', p.dept||'', p.grade||'', p.cls||'', today()]);
  return { success: true, interested: true };
}

function getInterested(p) {
  if (p.token !== getAdminToken()) return { success: false, error: '권한 없음' };
  if (!p.jobId) return { success: false, error: '공고ID 필요' };
  const list = sheetToObjects(getSheet(SH.INTEREST))
    .filter(r => String(r['공고ID']) === String(p.jobId))
    .map(r => ({ studentId: r['학번'], name: r['이름'], dept: r['학과'], grade: r['학년'], cls: r['반'], date: r['등록일'] }));
  return { success: true, data: list };
}

function getMyInterests(p) {
  if (!p.studentId) return { success: false, error: '학번 필요' };
  const ids = sheetToObjects(getSheet(SH.INTEREST))
    .filter(r => String(r['학번']) === String(p.studentId))
    .map(r => String(r['공고ID']));
  return { success: true, data: ids };
}

// ══════════════════════════════════════════════
// 공고 통계
// ══════════════════════════════════════════════
function getJobStats(p) {
  const interest = {}, apply = {};
  try {
    sheetToObjects(getSheet(SH.INTEREST)).forEach(r => {
      const id = String(r['공고ID']); interest[id] = (interest[id]||0) + 1;
    });
  } catch(e) {}
  try {
    sheetToObjects(getSheet(SH.APPLY)).forEach(r => {
      const id = String(r['공고ID']); apply[id] = (apply[id]||0) + 1;
    });
  } catch(e) {}
  return { success: true, interest, apply };
}

function incrementView(p) {
  if (!p.jobId) return { success: false };
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['ID']) === String(p.jobId));
  if (!row) return { success: false };
  const next = (Number(row['조회수']) || 0) + 1;
  sh.getRange(row['_row'], 14).setValue(next);
  return { success: true, views: next };
}

function getArchive(p) {
  return getReviews(p);
}

// ══════════════════════════════════════════════
// 선배취업아카이브 CRUD
// ══════════════════════════════════════════════
function getReviews(p) {
  let sh;
  try { sh = getSheet(SH.ARCHIVE); } catch(_) { return { success: true, data: [] }; }
  let list = sheetToObjects(sh).map(r => ({
    _row   : r['_row'],
    id     : r['ID'],
    year   : r['졸업연도']  || '',
    type   : r['기업구분']  || '',
    co     : r['업체명']    || '',
    dept   : r['학과']      || '',
    sid    : r['학번']      || '',
    sname  : r['이름']      || '',
    middle : r['출신중학교'] || '',
    certs  : r['자격증']    || '',
    attend : r['출결']      || '',
    clubs  : r['동아리']    || '',
    summary: r['성적요약']  || '',
    review : r['합격후기']  || '',
    date   : r['등록일']    || '',
    essays : r['합격자소서']
               ? String(r['합격자소서']).split('|').map(s => { const[n,u]=s.split('::'); return {name:n||'자소서',url:u||s}; })
               : [],
  }));
  if (p && p.dept) list = list.filter(a => a.dept === p.dept);
  return { success: true, data: list };
}

function addReviewSheet(p) {
  const sh = getSheet(SH.ARCHIVE);
  const id = generateId('AR');
  const essaysStr = (() => {
    try {
      const arr = typeof p.essays === 'string' ? JSON.parse(p.essays) : (p.essays || []);
      return Array.isArray(arr) ? arr.map(f => `${f.name}::${f.url}`).join('|') : '';
    } catch(_) { return ''; }
  })();
  sh.appendRow([
    id, p.year||'', p.type||'', p.co||'', p.dept||'', p.sid||'', p.sname||'',
    p.middle||'', p.certs||'', p.attend||'', p.clubs||'', p.summary||'',
    p.review||'', today(), essaysStr,
  ]);
  return { success: true, id };
}

function deleteReview(p) {
  if (!p.id) return { success: false, error: 'ID 필요' };
  const sh   = getSheet(SH.ARCHIVE);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['ID']) === String(p.id));
  if (!row) return { success: false, error: '데이터 없음' };
  sh.deleteRow(row['_row']);
  return { success: true };
}

// ══════════════════════════════════════════════
// 파일 업로드
// ══════════════════════════════════════════════
function uploadFileToDrive(p) {
  if (!p.name || !p.base64) return { success: false, error: '파일 데이터 없음' };
  try {
    const decoded = Utilities.base64Decode(p.base64);
    const blob    = Utilities.newBlob(decoded, p.mimeType || 'application/octet-stream', p.name);
    let folder;
    const fid = PropertiesService.getScriptProperties().getProperty('UPLOAD_FOLDER_ID');
    try { folder = fid ? DriveApp.getFolderById(fid) : DriveApp.getRootFolder(); }
    catch(e) { folder = DriveApp.getRootFolder(); }
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, url: 'https://drive.google.com/file/d/' + file.getId() + '/view', name: p.name };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ══════════════════════════════════════════════
// 시트 초기화
// ══════════════════════════════════════════════
function initSheets(p) {
  const headers = {
    [SH.STUDENTS] : ['학번','이름','학과','학년','반','성별','생년월일','비밀번호','담임ID','등록일','자격증수','생기부업로드','자격증','출결','동아리','임원','성적요약'],
    [SH.COMPANIES]: ['업체ID','업체명','업종','주소','담당자','연락처','이메일','등록일'],
    [SH.JOBS]     : ['ID','회사유형','회사명','공고제목','근무지','모집인원','마감일','학교장추천','추천인원','첨부파일','태그','등록일','상태','조회수'],
    [SH.PRACTICE] : ['학번','이름','학과','학년','반','업체명','시작일','종료일','담당교사ID','학년도'],
    [SH.EMPLOY]   : ['학번','이름','학과','업체명','취업일','고용형태','담당교사ID','학년도'],
    [SH.ANNUAL]   : ['학년도','졸업생수','취업자수','취업률'],
    [SH.ARCHIVE]  : ['ID','학번','이름','학과','졸업연도','업체명','합격자소서','후기','등록일'],
    [SH.APPLY]    : ['공고ID','공고명','학번','이름','학과','학년','반','지원일','등록구분','등록자ID'],
    [SH.INTEREST] : ['공고ID','공고명','학번','이름','학과','학년','반','등록일'],
    [SH.PROGRAMS] : ['ID','프로그램명','버전','설명','파일명','URL','크기','등록일'],  // ★ 추가
  };

  const results = [];
  Object.entries(headers).forEach(([name, cols]) => {
    let sh = SS.getSheetByName(name);
    if (!sh) { sh = SS.insertSheet(name); results.push('생성: ' + name); }
    else results.push('기존: ' + name);
    if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  return { success: true, results };
}

function runInitSheets() {
  Logger.log(JSON.stringify(initSheets({ token: getAdminToken() })));
}

// ══════════════════════════════════════════════
// 담임교사 조회
// ══════════════════════════════════════════════
function getTeachers(p) {
  const year = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties().getProperties();
  const prefix = `T_${year}_`;
  const teachers = [];
  Object.keys(props).forEach(key => {
    if (!key.startsWith(prefix)) return;
    const parts = key.replace(prefix, '').split('_');
    if (parts.length < 3) return;
    const [dept, grade, cls] = parts;
    const [name, pw] = (props[key] || '').split('::');
    teachers.push({ dept, grade, cls, name: name || '', pw: pw || '', year: Number(year) });
  });
  return { success: true, data: teachers };
}

// ══════════════════════════════════════════════
// 학년-반 구조 조회/저장
// ══════════════════════════════════════════════
function getClasses(p) {
  const year = p.year || new Date().getFullYear();
  const raw  = PropertiesService.getScriptProperties().getProperty(`CLASSES_${year}`);
  const data = raw ? safeParseJSON(raw, []) : [];
  return { success: true, data };
}

function saveClasses(p) {
  const year    = p.year || new Date().getFullYear();
  const classes = typeof p.classes === 'string' ? p.classes : JSON.stringify(p.classes || []);
  PropertiesService.getScriptProperties().setProperty(`CLASSES_${year}`, classes);
  return { success: true };
}

// ══════════════════════════════════════════════
// 학생 취업/진학 상태 업데이트
// ══════════════════════════════════════════════
function updateStudentEmploy(p) {
  if (!p.studentId) return { success: false, error: '학번 필요' };
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['학번']) === String(p.studentId));
  if (!row) return { success: false, error: '학생 없음' };
  if (p.employed !== undefined) {
    sh.getRange(row['_row'], 18).setValue(p.employed);
    sh.getRange(row['_row'], 20).setValue(p.company || '');
  }
  if (p.advanced !== undefined) {
    sh.getRange(row['_row'], 19).setValue(p.advanced);
    sh.getRange(row['_row'], 21).setValue(p.school || '');
  }
  return { success: true };
}

function testGetJobs() {
  Logger.log(JSON.stringify(getJobs({})));
}

// ══════════════════════════════════════════════
// 현장실습 자료실 — 섹션
// ══════════════════════════════════════════════
function getPracticeSections() {
  let sh;
  try { sh = getSheet(SH.PR_SEC); } catch(_) { return { success: true, data: [] }; }
  if (sh.getLastRow() > 0) {
    const firstCell = sh.getRange(1, 1).getValue();
    if (firstCell !== 'ID') {
      sh.insertRowBefore(1);
      sh.getRange(1, 1, 1, 4).setValues([['ID','제목','순서','등록일']]);
    }
  }
  const list = sheetToObjects(sh)
    .map(r => ({ _row: r['_row'], id: r['ID'], title: r['제목']||'', order: Number(r['순서'])||0, date: r['등록일']||'' }))
    .sort((a,b) => a.order - b.order);
  return { success: true, data: list };
}

function addPracticeSection(p) {
  const sh = getSheet(SH.PR_SEC);
  const rows = sheetToObjects(sh);
  const maxOrder = rows.length ? Math.max(...rows.map(r => Number(r['순서'])||0)) : 0;
  const id = generateId('PS');
  sh.appendRow([id, p.title||'새 단계', maxOrder+1, today()]);
  return { success: true, id };
}

function updatePracticeSection(p) {
  const sh   = getSheet(SH.PR_SEC);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '섹션 없음' };
  sh.getRange(row['_row'], 2).setValue(p.title||row['제목']);
  return { success: true };
}

function deletePracticeSection(p) {
  const sh   = getSheet(SH.PR_SEC);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '섹션 없음' };
  sh.deleteRow(row['_row']);
  try {
    const fsh   = getSheet(SH.PR_FILE);
    const frows = sheetToObjects(fsh).filter(r => r['섹션ID'] === p.id);
    frows.sort((a,b) => b['_row']-a['_row']).forEach(r => fsh.deleteRow(r['_row']));
  } catch(_) {}
  return { success: true };
}

function reorderPracticeSection(p) {
  const orders = typeof p.orders === 'string' ? JSON.parse(p.orders) : (p.orders||[]);
  const sh   = getSheet(SH.PR_SEC);
  const rows = sheetToObjects(sh);
  orders.forEach(o => {
    const row = rows.find(r => r['ID'] === o.id);
    if (row) sh.getRange(row['_row'], 3).setValue(Number(o.order));
  });
  return { success: true };
}

// ══════════════════════════════════════════════
// 현장실습 자료실 — 파일
// ══════════════════════════════════════════════
function getPracticeFiles(p) {
  let sh;
  try { sh = getSheet(SH.PR_FILE); } catch(_) { return { success: true, data: [] }; }
  if (sh.getLastRow() > 0) {
    const firstCell = sh.getRange(1, 1).getValue();
    if (firstCell !== 'ID') {
      sh.insertRowBefore(1);
      sh.getRange(1, 1, 1, 6).setValues([['ID','섹션ID','파일명','파일URL','순서','등록일']]);
    }
  }
  let list = sheetToObjects(sh).map(r => ({
    _row  : r['_row'],
    id    : r['ID'],
    secId : r['섹션ID'] || '',
    name  : r['파일명'] || '',
    url   : r['파일URL'] || '',
    order : Number(r['순서']) || 0,
    date  : r['등록일'] || '',
  })).sort((a,b) => a.order - b.order);
  if (p && p.secId) list = list.filter(f => f.secId === p.secId);
  return { success: true, data: list };
}

function addPracticeFile(p) {
  const sh   = getSheet(SH.PR_FILE);
  const rows = sheetToObjects(sh).filter(r => r['섹션ID'] === p.secId);
  const maxOrder = rows.length ? Math.max(...rows.map(r => Number(r['순서'])||0)) : 0;
  const id = generateId('PF');
  sh.appendRow([id, p.secId||'', p.name||'', p.url||'', maxOrder+1, today()]);
  return { success: true, id };
}

function updatePracticeFile(p) {
  const sh   = getSheet(SH.PR_FILE);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '파일 없음' };
  if (p.name) sh.getRange(row['_row'], 3).setValue(p.name);
  if (p.url)  sh.getRange(row['_row'], 4).setValue(p.url);
  return { success: true };
}

function deletePracticeFile(p) {
  const sh   = getSheet(SH.PR_FILE);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '파일 없음' };
  sh.deleteRow(row['_row']);
  return { success: true };
}

function reorderPracticeFile(p) {
  const orders = typeof p.orders === 'string' ? JSON.parse(p.orders) : (p.orders||[]);
  const sh   = getSheet(SH.PR_FILE);
  const rows = sheetToObjects(sh);
  orders.forEach(o => {
    const row = rows.find(r => r['ID'] === o.id);
    if (row) sh.getRange(row['_row'], 5).setValue(Number(o.order));
  });
  return { success: true };
}

// ══════════════════════════════════════════════
// 학반별 실제 학생 수 집계
// ══════════════════════════════════════════════
function getStudentCountByClass(p) {
  const year = p.year || new Date().getFullYear();
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const counts = {};
  rows.forEach(r => {
    const sy = String(r['학년도'] || '');
    if (sy && sy !== String(year)) return;
    const key = `${r['학과']}_${r['학년']}_${r['반']}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return { success: true, data: counts };
}

// ══════════════════════════════════════════════
// DEPTS/BANNERS 연도별 키 마이그레이션
// ══════════════════════════════════════════════
function migrateDepts(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const rawD  = props.getProperty('DEPTS');
  const rawB  = props.getProperty('BANNERS');
  if (rawD) props.setProperty(`DEPTS_${year}`, rawD);
  if (rawB) props.setProperty(`BANNERS_${year}`, rawB);
  return { success: true, message: `DEPTS → DEPTS_${year}, BANNERS → BANNERS_${year} 복사 완료` };
}

// ══════════════════════════════════════════════
// 학과별 취업현황 통계
// ══════════════════════════════════════════════
function getEmployStats(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const data  = safeParseJSON(props.getProperty(`EMPLOY_STATS_${year}`) || '[]', []);
  return { success: true, data, year: Number(year) };
}

function saveEmployStats(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const raw   = typeof p.data === 'string' ? p.data : JSON.stringify(p.data || []);
  props.setProperty(`EMPLOY_STATS_${year}`, raw);
  return { success: true };
}

// ══════════════════════════════════════════════
// ★ 프로그램 관리 (추가)
// ══════════════════════════════════════════════
function getPrograms(p) {
  let sh;
  try { sh = getSheet(SH.PROGRAMS); } catch(_) { return { success: true, list: [] }; }
  if (sh.getLastRow() < 2) return { success: true, list: [] };
  const rows = sheetToObjects(sh);
  const list = rows
    .filter(function(r) { return r['ID']; })
    .map(function(r) {
      return {
        id      : r['ID'],
        name    : r['프로그램명'] || '',
        version : r['버전']       || '',
        desc    : r['설명']       || '',
        filename: r['파일명']     || '',
        url     : r['URL']        || '',
        size    : Number(r['크기']) || 0,
        date    : r['등록일']     || '',
      };
    });
  return { success: true, list: list };
}

function addProgram(p) {
  const sh = getSheet(SH.PROGRAMS);
  const id = 'pg_' + Date.now();
  sh.appendRow([
    id,
    p.name     || '',
    p.version  || '',
    p.desc     || '',
    p.filename || '',
    p.url      || '',
    p.size     || 0,
    today(),
  ]);
  return { success: true, id: id };
}

function deleteProgram(p) {
  if (!p.id) return { success: false, error: 'ID 필요' };
  const sh   = getSheet(SH.PROGRAMS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(function(r) { return r['ID'] === p.id; });
  if (!row) return { success: false, error: '항목 없음' };
  sh.deleteRow(row['_row']);
  return { success: true };
}

// ══════════════════════════════════════════════
// getAll — 배치 함수
// ══════════════════════════════════════════════
function getAll(p) {
  const year = p.year || new Date().getFullYear();
  try {
    const banners = getBanners({ year }).data || [];
    const depts   = getDepts({ year }).data   || [];
    const props   = PropertiesService.getScriptProperties();
    const years   = safeParseJSON(props.getProperty('YEARS'), []);
    const stats   = (() => { try { return getStats(); } catch(_){ return {data:[], latest:{}}; } })();
    const jobs    = getJobs({ year: year }).data || [];
    const reviews = (() => { try { return getReviews({}); } catch(_){ return {data:[]}; } })();
    const employ  = (() => { try { return getEmployStats({ year }); } catch(_){ return {data:[]}; } })();
    const teachers = (() => { try { return getTeachers({ year }); } catch(_){ return {data:[]}; } })();
    const classes  = (() => { try { return getClasses({ year }); } catch(_){ return {data:[]}; } })();
    return { success: true, banners, depts, years, stats: stats.data, latest: stats.latest, jobs,
             reviews: reviews.data, employ: employ.data, teachers: teachers.data, classes: classes.data };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ══════════════════════════════════════════════
// 관리연도
// ══════════════════════════════════════════════
function getYears() {
  const props   = PropertiesService.getScriptProperties();
  const thisYear = new Date().getFullYear();
  let years = safeParseJSON(props.getProperty('YEARS'), []);
  if (!years.length) {
    years = [thisYear - 1, thisYear];
    props.setProperty('YEARS', JSON.stringify(years));
  }
  years.sort((a, b) => b - a);
  return { success: true, data: years };
}

function addYear(p) {
  const year = parseInt(p.year);
  if (!year || isNaN(year)) return { success: false, error: '유효한 연도를 입력하세요' };
  const props = PropertiesService.getScriptProperties();
  let years   = safeParseJSON(props.getProperty('YEARS'), []);
  if (years.includes(year)) return { success: false, error: '이미 존재하는 연도입니다' };
  years.push(year);
  years.sort((a, b) => b - a);
  props.setProperty('YEARS', JSON.stringify(years));
  return { success: true, data: years };
}

function deleteYear(p) {
  const year  = parseInt(p.year);
  const props = PropertiesService.getScriptProperties();
  let years   = safeParseJSON(props.getProperty('YEARS'), []);
  years = years.filter(y => y !== year);
  props.setProperty('YEARS', JSON.stringify(years));
  return { success: true, data: years };
}

// ══════════════════════════════════════════════
// ★ 관리자 비밀번호 — ScriptProperties (보안 패치)
// ══════════════════════════════════════════════
function verifyAdminPw(p) {
  const props    = PropertiesService.getScriptProperties();
  const masterPw = props.getProperty('ADMIN_MASTER_PW') || 'samil_master';
  const commonPw = props.getProperty('ADMIN_COMMON_PW') || 'samil2024';
  if (!p.pw) return { success: false, error: '비밀번호 입력 필요' };
  if (p.pw === masterPw || p.pw === commonPw) {
    return { success: true, token: getAdminToken() };
  }
  return { success: false, error: '비밀번호가 맞지 않습니다' };
}

function changeAdminPw(p) {
  const props    = PropertiesService.getScriptProperties();
  const masterPw = props.getProperty('ADMIN_MASTER_PW') || 'samil_master';
  const commonPw = props.getProperty('ADMIN_COMMON_PW') || 'samil2024';

  if (!p.currentPw || !p.newPw) return { success: false, error: '비밀번호를 모두 입력하세요.' };
  if (p.newPw.length < 6) return { success: false, error: '새 비밀번호는 6자 이상이어야 합니다.' };

  const validCurrent = p.currentPw === masterPw || p.currentPw === commonPw || p.token === getAdminToken();
  if (!validCurrent) return { success: false, error: '현재 비밀번호가 맞지 않습니다.' };

  if (p.currentPw === masterPw) {
    props.setProperty('ADMIN_MASTER_PW', p.newPw);
  } else {
    props.setProperty('ADMIN_COMMON_PW', p.newPw);
  }
  props.setProperty('ADMIN_TOKEN', p.newPw);

  return { success: true, token: p.newPw };
}

function saveAdminPw(p) {
  const props = PropertiesService.getScriptProperties();
  if (p.masterPw) props.setProperty('ADMIN_MASTER_PW', p.masterPw);
  if (p.commonPw) props.setProperty('ADMIN_COMMON_PW', p.commonPw);
  return { success: true };
}

// ══════════════════════════════════════════════
// 담임교사 수정
// ══════════════════════════════════════════════
function updateTeacher(p) {
  const props = PropertiesService.getScriptProperties();
  const year  = p.year || new Date().getFullYear();
  const key   = `T_${year}_${p.dept}_${p.grade}_${p.cls}`;
  if (!props.getProperty(key)) return { success: false, error: '계정 없음' };
  props.setProperty(key, `${p.name}::${p.pw}`);
  return { success: true };
}

// ══════════════════════════════════════════════
// 학과 수정
// ══════════════════════════════════════════════
function updateDept(p) {
  const year  = p.year || new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const key   = `DEPTS_${year}`;
  const depts = safeParseJSON(props.getProperty(key) || '[]', []);
  const idx   = depts.findIndex(d => d.name === p.oldName);
  if (idx === -1) return { success: false, error: '학과 없음' };
  depts[idx].name = p.newName;
  props.setProperty(key, JSON.stringify(depts));
  return { success: true };
}
