/**
 * samil-jobs Google Apps Script Backend
 * Sheets ID: 16lcacHI7Q04kufwbWTtQiR5rWZnOpBcZYoZRyNV9PzI
 *
 * 배포: [확장 프로그램] → [Apps Script] → [배포] → [새 배포]
 *   유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자
 */

// ══════════════════════════════════════════════
// 설정
// ══════════════════════════════════════════════
const SHEET_ID    = '16lcacHI7Q04kufwbWTtQiR5rWZnOpBcZYoZRyNV9PzI';
const ADMIN_TOKEN = 'samil_admin_2024';   // 관리자 토큰 (배포 후 변경 권장)
const SS          = SpreadsheetApp.openById(SHEET_ID);

// 시트 이름 상수
const SH = {
  STUDENTS  : '학생정보',
  COMPANIES : '업체DB',
  JOBS      : '채용공고',
  PRACTICE  : '현장실습이력',
  EMPLOY    : '취업확정이력',
  ANNUAL    : '연도별매칭이력',
  ARCHIVE   : '선배취업아카이브',
};

// ══════════════════════════════════════════════
// 진입점
// ══════════════════════════════════════════════
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

    // ── 공개 읽기 (인증 불필요) ──
    if (action === 'getJobs')     result = getJobs(p);
    else if (action === 'getDepts')    result = getDepts();
    else if (action === 'getStats')    result = getStats();
    else if (action === 'getBanners')  result = getBanners();
    else if (action === 'getArchive')  result = getArchive(p);

    // ── 인증 필요 ──
    else if (action === 'loginStudent')  result = loginStudent(p);
    else if (action === 'loginTeacher')  result = loginTeacher(p);
    else if (action === 'getStudents')   result = getStudents(p);
    else if (action === 'saveRecord')    result = saveRecord(p);
    else if (action === 'getMyRecord')   result = getMyRecord(p);

    // ── 관리자 전용 ──
    else if (action === 'addJob')        result = adminAction(p, addJob);
    else if (action === 'updateJob')     result = adminAction(p, updateJob);
    else if (action === 'deleteJob')     result = adminAction(p, deleteJob);
    else if (action === 'toggleJob')     result = adminAction(p, toggleJob);

    else if (action === 'addBanner')     result = adminAction(p, addBanner);
    else if (action === 'deleteBanner')  result = adminAction(p, deleteBanner);

    else if (action === 'addDept')       result = adminAction(p, addDept);
    else if (action === 'deleteDept')    result = adminAction(p, deleteDept);

    else if (action === 'addTeacher')    result = adminAction(p, addTeacher);
    else if (action === 'deleteTeacher') result = adminAction(p, deleteTeacher);

    else if (action === 'addStudent')    result = adminAction(p, addStudent);
    else if (action === 'resetStudentPw')result = adminAction(p, resetStudentPw);

    else if (action === 'saveEmploy')    result = adminAction(p, saveEmploy);
    else if (action === 'saveAnnualStat')result = adminAction(p, saveAnnualStat);
    else if (action === 'deleteAnnualStat') result = adminAction(p, deleteAnnualStat);

    else if (action === 'initSheets')    result = adminAction(p, initSheets);

    else result = { success: false, error: 'Unknown action: ' + action };

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function adminAction(p, fn) {
  if (p.token !== ADMIN_TOKEN) return { success: false, error: '관리자 인증 실패' };
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
  const sh = SS.getSheetByName(name);
  if (!sh) throw new Error('시트 없음: ' + name);
  return sh;
}

function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row, i) => {
    const obj = { _row: i + 2 };  // 실제 시트 행 번호
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

// ══════════════════════════════════════════════
// ① 채용공고
// ══════════════════════════════════════════════
/**
 * 헤더: 공고ID | 업체명 | 직종 | 근무지 | 모집인원 | 마감일
 *        태그 | 추천여부 | 추천인원 | 설명 | 첨부URL | 상태 | 등록일
 */
function getJobs(p) {
  const sh    = getSheet(SH.JOBS);
  const rows  = sheetToObjects(sh);
  let jobs    = rows
    .filter(r => r['상태'] !== '삭제')
    .map(r => ({
      id      : r['ID'],
      type    : r['회사유형'] || '',
      co      : r['회사명'],
      job     : r['공고제목'],
      loc     : r['근무지'],
      cnt     : r['모집인원'],
      salary  : r['급여'] || '',
      dl      : r['마감일'] ? Utilities.formatDate(new Date(r['마감일']), 'Asia/Seoul', 'yyyy-MM-dd') : '',
      tags    : r['태그'] ? String(r['태그']).split(',').map(t => t.trim()).filter(Boolean) : [],
      rec     : r['학교장추천'] === true || r['학교장추천'] === 'TRUE' || r['학교장추천'] === '예',
      recCnt  : Number(r['추천인원']) || 0,
      files   : r['첨부파일'] ? String(r['첨부파일']).split('|').map(s => { const[n,u]=s.split('::'); return{name:n||'첨부',url:u||s}; }) : [],
      active  : r['상태'] === '진행중',
      date    : r['등록일'] ? Utilities.formatDate(new Date(r['등록일']), 'Asia/Seoul', 'yyyy-MM-dd') : '',
      views   : Number(r['조회수']) || 0,
      _row    : r['_row'],
    }));

  if (p.activeOnly === 'true') jobs = jobs.filter(j => j.active);
  return { success: true, data: jobs };
}

function addJob(p) {
  const sh = getSheet(SH.JOBS);
  const id = generateId('J');
  sh.appendRow([
    id, p.type||'기타', p.co, p.job, p.loc, p.cnt,
    p.dl,
    p.rec === 'true' ? '예' : '아니오',
    p.recCnt || 0,
    p.files || '',
    p.tags || '',
    today(), '진행중', 0
  ]);
  return { success: true, id };
}

function updateJob(p) {
  const sh   = getSheet(SH.JOBS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => r['ID'] === p.id);
  if (!row) return { success: false, error: '공고 없음' };
  const r = row['_row'];
  sh.getRange(r, 2, 1, 12).setValues([[
    p.type||row['회사유형']||'기타', p.co, p.job, p.loc, p.cnt,
    p.dl,
    p.rec === 'true' ? '예' : '아니오',
    p.recCnt || 0,
    p.files || '',
    p.tags || '',
    row['등록일'],
    row['상태']
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
/**
 * 헤더: 학번 | 이름 | 학과 | 학년 | 반 | 성별 | 생년월일 | 비밀번호
 *        담임ID | 등록일 | 자격증수 | 생기부업로드
 */
function loginStudent(p) {
  const dept  = p.dept?.trim();
  const id    = p.id?.trim();
  const pw    = p.pw?.trim();    // 생년월일 6자리 or 변경된 비밀번호
  if (!dept || !id || !pw) return { success: false, error: '입력값 오류' };

  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const found = rows.find(r =>
    String(r['학번']).trim() === id &&
    String(r['비밀번호']).trim() === pw &&
    String(r['학과']).trim() === dept
  );
  if (!found) return { success: false, error: '학과/학번/비밀번호가 일치하지 않습니다' };

  return {
    success : true,
    student : {
      id      : found['학번'],
      name    : found['이름'],
      dept    : found['학과'],
      grade   : found['학년'],
      cls     : found['반'],
      gender  : found['성별'],
      birth   : found['생년월일'],
      teacher : found['담임ID'],
      certCount : Number(found['자격증수']) || 0,
      uploaded  : found['생기부업로드'] === true || found['생기부업로드'] === 'TRUE',
    }
  };
}

function getStudents(p) {
  // 담임교사: 본인 반만 / 관리자: 전체
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  let list = rows.map(r => ({
    id       : r['학번'],
    name     : r['이름'],
    dept     : r['학과'],
    grade    : r['학년'],
    cls      : r['반'],
    gender   : r['성별'],
    birth    : r['생년월일'],
    teacher  : r['담임ID'],
    certCount: Number(r['자격증수']) || 0,
    uploaded : r['생기부업로드'] === true || r['생기부업로드'] === 'TRUE',
  }));

  // 담임 필터 (teacherId 파라미터)
  if (p.teacherId) list = list.filter(s => s.teacher === p.teacherId);
  // 학과 필터
  if (p.dept) list = list.filter(s => s.dept === p.dept);

  // 관리자가 아니면 비밀번호 제거
  if (p.token !== ADMIN_TOKEN) list = list.map(s => { const {birth, ...rest} = s; return rest; });
  return { success: true, data: list };
}

function addStudent(p) {
  const sh = getSheet(SH.STUDENTS);
  sh.appendRow([
    p.id, p.name, p.dept, p.grade, p.cls, p.gender || '—',
    p.birth, p.birth,  // 초기 비밀번호 = 생년월일
    p.teacher || '', today(), 0, false
  ]);
  return { success: true };
}

function resetStudentPw(p) {
  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const row  = rows.find(r => String(r['학번']).trim() === p.id);
  if (!row) return { success: false, error: '학생 없음' };
  sh.getRange(row['_row'], 8).setValue(row['생년월일']);  // 비밀번호 = 생년월일
  return { success: true };
}

// ══════════════════════════════════════════════
// ③ 담임교사 로그인
// ══════════════════════════════════════════════
/**
 * 별도 담임교사 시트 없음 — 학생정보 시트의 '담임ID' 컬럼 기반
 * teachers 데이터는 admin이 관리 (로컬 → Sheets 이전 시 추가)
 * 현재: GAS 스크립트 속성에 담임계정 저장 방식으로 간단 구현
 *
 * 계정 형식: {year}_{dept}_{grade}_{cls}_{name}_{pw}
 * 예) 2024_반도체과_3_1_홍길동_samil3101
 */
function loginTeacher(p) {
  const { dept, grade, cls, name, pw } = p;
  if (!dept || !grade || !cls || !name || !pw) return { success: false, error: '입력값 오류' };

  const props = PropertiesService.getScriptProperties();
  const year  = new Date().getFullYear();
  const key   = `T_${year}_${dept}_${grade}_${cls}`;
  const stored = props.getProperty(key);

  if (!stored) return { success: false, error: '등록된 계정이 없습니다. 관리자에게 문의하세요.' };

  const [storedName, storedPw] = stored.split('::');
  if (storedName !== name || storedPw !== pw) return { success: false, error: '이름 또는 비밀번호 오류' };

  const teacherId = `${year}${dept}${grade}${cls}`;
  return {
    success: true,
    teacher: { id: teacherId, name, dept, grade, cls, year }
  };
}

// ══════════════════════════════════════════════
// 담임교사 계정 관리 (관리자)
// ══════════════════════════════════════════════
function addTeacher(p) {
  const props = PropertiesService.getScriptProperties();
  const year  = p.year || new Date().getFullYear();
  const key   = `T_${year}_${p.dept}_${p.grade}_${p.cls}`;
  props.setProperty(key, `${p.name}::${p.pw}`);
  return { success: true };
}

function deleteTeacher(p) {
  const props = PropertiesService.getScriptProperties();
  const year  = p.year || new Date().getFullYear();
  const key   = `T_${year}_${p.dept}_${p.grade}_${p.cls}`;
  props.deleteProperty(key);
  return { success: true };
}

// ══════════════════════════════════════════════
// ④ 생기부 데이터 저장 (담임 업로드 → 학생정보 시트 업데이트)
// ══════════════════════════════════════════════
/**
 * 학생 1명 레코드를 학생정보 시트에 upsert
 * p.record = { id, name, dept, grade, cls, gender, birth, certCount, ... }
 */
function saveRecord(p) {
  // 담임 또는 관리자 권한 확인
  if (!p.teacherId && p.token !== ADMIN_TOKEN) return { success: false, error: '권한 없음' };

  const record = typeof p.record === 'string' ? JSON.parse(p.record) : p.record;
  if (!record || !record.id) return { success: false, error: '레코드 없음' };

  const sh   = getSheet(SH.STUDENTS);
  const rows = sheetToObjects(sh);
  const existing = rows.find(r => String(r['학번']).trim() === String(record.id).trim());

  const rowData = [
    record.id, record.name, record.dept, record.grade, record.cls,
    record.gender || '—', record.birth || '',
    existing ? existing['비밀번호'] : (record.birth || ''),  // 기존 PW 유지
    p.teacherId || (existing && existing['담임ID']) || '',
    existing ? existing['등록일'] : today(),
    record.certCount || 0,
    true  // 생기부업로드 = true
  ];

  if (existing) {
    sh.getRange(existing['_row'], 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }

  return { success: true };
}

/**
 * 학생 본인 레코드 조회 (현장실습이력, 취업확정이력 포함)
 */
function getMyRecord(p) {
  if (!p.studentId) return { success: false, error: '학번 필요' };

  const practice = sheetToObjects(getSheet(SH.PRACTICE))
    .filter(r => String(r['학번']).trim() === p.studentId)
    .map(r => ({
      company: r['업체명'], start: r['시작일'], end: r['종료일'], year: r['학년도']
    }));

  const employ = sheetToObjects(getSheet(SH.EMPLOY))
    .filter(r => String(r['학번']).trim() === p.studentId)
    .map(r => ({
      company: r['업체명'], date: r['취업일'], type: r['고용형태'], year: r['학년도']
    }));

  return { success: true, data: { practice, employ } };
}

// ══════════════════════════════════════════════
// 학과 관리
// ══════════════════════════════════════════════
/**
 * 학과는 별도 시트 없이 ScriptProperties로 관리
 * (소규모 & 변경 빈도 낮음)
 * 형식: DEPTS = JSON array of {name, code, startYear, endYear, alias, mergedFrom}
 */
function getDepts() {
  const props = PropertiesService.getScriptProperties();
  const raw   = props.getProperty('DEPTS') || '[]';
  return { success: true, data: JSON.parse(raw) };
}

function addDept(p) {
  const props = PropertiesService.getScriptProperties();
  const depts = JSON.parse(props.getProperty('DEPTS') || '[]');
  if (depts.find(d => d.name === p.name)) return { success: false, error: '이미 존재하는 학과' };
  depts.push({
    name: p.name, code: p.code || '',
    startYear: p.startYear || new Date().getFullYear(),
    endYear: null, alias: [], mergedFrom: []
  });
  props.setProperty('DEPTS', JSON.stringify(depts));
  return { success: true };
}

function deleteDept(p) {
  const props = PropertiesService.getScriptProperties();
  const depts = JSON.parse(props.getProperty('DEPTS') || '[]');
  const updated = depts.filter(d => d.name !== p.name);
  props.setProperty('DEPTS', JSON.stringify(updated));
  return { success: true };
}

// ══════════════════════════════════════════════
// 배너
// ══════════════════════════════════════════════
function getBanners() {
  const props = PropertiesService.getScriptProperties();
  const raw   = props.getProperty('BANNERS') || '[]';
  return { success: true, data: JSON.parse(raw) };
}

function addBanner(p) {
  const props   = PropertiesService.getScriptProperties();
  const banners = JSON.parse(props.getProperty('BANNERS') || '[]');
  banners.push({
    id: generateId('B'), title: p.title, url: p.url || '#',
    dl: p.dl || '', color: p.color || '#1E3A6E', date: today()
  });
  props.setProperty('BANNERS', JSON.stringify(banners));
  return { success: true };
}

function deleteBanner(p) {
  const props   = PropertiesService.getScriptProperties();
  const banners = JSON.parse(props.getProperty('BANNERS') || '[]');
  props.setProperty('BANNERS', JSON.stringify(banners.filter(b => b.id !== p.id)));
  return { success: true };
}

// ══════════════════════════════════════════════
// 취업통계 (연도별매칭이력 시트)
// ══════════════════════════════════════════════
function getStats() {
  const sh   = getSheet(SH.ANNUAL);
  const rows = sheetToObjects(sh);
  const data = rows.map(r => ({
    year: r['학년도'], grad: Number(r['졸업생수']) || 0,
    rate: Number(r['취업률']) || 0,
    employed: Number(r['취업자수']) || 0,
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
  const sh   = getSheet(SH.ANNUAL);
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
// 선배취업아카이브
// ══════════════════════════════════════════════
function getArchive(p) {
  const sh   = getSheet(SH.ARCHIVE);
  const rows = sheetToObjects(sh);
  let list = rows.map(r => ({
    name    : r['이름'],
    dept    : r['학과'],
    gradYear: r['졸업년도'],
    company : r['업체명'],
    industry: r['업종'],
    comment : r['한마디'],
  }));
  if (p.dept) list = list.filter(a => a.dept === p.dept);
  return { success: true, data: list };
}

// ══════════════════════════════════════════════
// 시트 초기화 (최초 1회 실행)
// ══════════════════════════════════════════════
function initSheets(p) {
  const headers = {
    [SH.STUDENTS] : ['학번','이름','학과','학년','반','성별','생년월일','비밀번호','담임ID','등록일','자격증수','생기부업로드'],
    [SH.COMPANIES]: ['업체ID','업체명','업종','주소','담당자','연락처','이메일','등록일'],
    [SH.JOBS]     : ['ID','회사유형','회사명','공고제목','근무지','모집인원','마감일','학교장추천','추천인원','첨부파일','태그','등록일','상태','조회수'],
    [SH.PRACTICE] : ['학번','이름','학과','학년','반','업체명','시작일','종료일','담당교사ID','학년도'],
    [SH.EMPLOY]   : ['학번','이름','학과','업체명','취업일','고용형태','담당교사ID','학년도'],
    [SH.ANNUAL]   : ['학년도','졸업생수','취업자수','취업률'],
    [SH.ARCHIVE]  : ['이름','학과','졸업년도','업체명','업종','한마디'],
  };

  const results = [];
  Object.entries(headers).forEach(([name, cols]) => {
    let sh = SS.getSheetByName(name);
    if (!sh) {
      sh = SS.insertSheet(name);
      results.push('생성: ' + name);
    } else {
      results.push('기존: ' + name);
    }
    // 헤더 행이 비어있으면 설정
    if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });

  return { success: true, results };
}

/**
 * ──────────────────────────────────────────────
 * 개발용: 스크립트 에디터에서 직접 실행 가능
 * ──────────────────────────────────────────────
 */
function runInitSheets() {
  const result = initSheets({ token: ADMIN_TOKEN });
  Logger.log(JSON.stringify(result));
}

function testGetJobs() {
  const result = getJobs({});
  Logger.log(JSON.stringify(result));
}
