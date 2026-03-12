/**
 * ★ 1199 Competition Market Gamification - Admin Auth & Activity Logger
 *
 * 이 스크립트를 구글 스프레드시트의 앱스스크립트(Apps Script)에 붙여넣으세요.
 * 스프레드시트 ID: 18sBaBBlZnxk68kf1jnWgSNTHbo1QbS0EHPnGm9H5wBg
 *
 * [설정 방법]
 * 1. 구글 스프레드시트 열기 → 확장 프로그램 → Apps Script
 * 2. 기존 코드를 모두 지우고 이 파일의 내용을 붙여넣기
 * 3. 저장 (Ctrl+S)
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 설명: "Admin Auth API"
 *    - 다음 사용자 인증정보로 실행: "나"
 *    - 액세스 권한: "모든 사용자"
 * 5. 배포 → 배포된 URL을 복사하여 앱의 환경변수(VITE_APPS_SCRIPT_URL)에 설정
 *
 * [시트 구조]
 * - "회원명부" 시트: A(No), B(성명), C(휴대폰), D(지메일), E(시작일), F(종료일), G(비고)
 * - "AdminLog" 시트: 자동 생성됨 — A(타임스탬프), B(이메일), C(성명), D(액션), E(상세내용)
 */

var SPREADSHEET_ID = '18sBaBBlZnxk68kf1jnWgSNTHbo1QbS0EHPnGm9H5wBg';
var MEMBER_SHEET_NAME = '회원명부';
var LOG_SHEET_NAME = 'AdminLog';

/**
 * CORS 대응을 위한 doGet (GET 요청 처리)
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * POST 요청 처리
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * 요청 핸들러
 */
function handleRequest(e) {
  try {
    var params;

    // POST body 또는 GET parameter에서 데이터 추출
    if (e.postData) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    } else {
      return createResponse({ success: false, error: 'No parameters provided' });
    }

    var action = params.action;

    switch (action) {
      case 'verifyAdmin':
        return createResponse(verifyAdmin(params.email));

      case 'logActivity':
        return createResponse(logActivity(params.email, params.name, params.activityType, params.detail));

      default:
        return createResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return createResponse({ success: false, error: err.toString() });
  }
}

/**
 * Admin 이메일 인증
 * - 회원명부 시트의 D열(지메일)에서 이메일을 찾음
 * - 시작일(E열)과 종료일(F열) 범위 내인지 확인
 * - 매칭되면 성명(B열)을 반환
 */
function verifyAdmin(email) {
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(MEMBER_SHEET_NAME);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + MEMBER_SHEET_NAME + '" not found' };
  }

  var data = sheet.getDataRange().getValues();
  var now = new Date();
  var emailLower = email.toLowerCase().trim();

  // 1행은 헤더이므로 2행부터 검색
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var sheetEmail = String(row[3]).toLowerCase().trim(); // D열 (인덱스 3)

    if (sheetEmail === emailLower) {
      var name = String(row[1]).trim(); // B열 (인덱스 1) - 성명
      var startDate = row[4]; // E열 - 시작일
      var endDate = row[5];   // F열 - 종료일

      // 날짜 유효성 체크 (시작일, 종료일이 있는 경우만)
      if (startDate && endDate) {
        var start = new Date(startDate);
        var end = new Date(endDate);
        // 종료일은 해당 날짜의 끝(23:59:59)까지 유효
        end.setHours(23, 59, 59, 999);

        if (now < start) {
          return { success: false, error: '아직 이용 시작일 전입니다. (시작일: ' + Utilities.formatDate(start, 'Asia/Seoul', 'yyyy-MM-dd') + ')' };
        }
        if (now > end) {
          return { success: false, error: '이용 기간이 만료되었습니다. (종료일: ' + Utilities.formatDate(end, 'Asia/Seoul', 'yyyy-MM-dd') + ')' };
        }
      }

      // 로그인 성공 로그 기록
      logActivity(email, name, 'LOGIN', '관리자 로그인 성공');

      return {
        success: true,
        name: name,
        email: email
      };
    }
  }

  return { success: false, error: '등록되지 않은 이메일입니다. 관리자에게 문의하세요.' };
}

/**
 * Admin 활동 로그 기록
 * AdminLog 시트에 기록 (시트가 없으면 자동 생성)
 */
function logActivity(email, name, activityType, detail) {
  if (!email || !activityType) {
    return { success: false, error: 'Email and activityType are required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);

  // AdminLog 시트가 없으면 생성
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    // 헤더 설정
    logSheet.getRange(1, 1, 1, 5).setValues([['타임스탬프', '이메일', '성명', '액션', '상세내용']]);
    // 헤더 스타일
    var headerRange = logSheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#FFFF00');
    // 열 너비 조정
    logSheet.setColumnWidth(1, 180);
    logSheet.setColumnWidth(2, 200);
    logSheet.setColumnWidth(3, 100);
    logSheet.setColumnWidth(4, 120);
    logSheet.setColumnWidth(5, 300);
  }

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // 새 행에 로그 추가
  logSheet.appendRow([timestamp, email, name || '', activityType, detail || '']);

  return { success: true, message: 'Activity logged' };
}

/**
 * JSON 응답 생성 (CORS 허용)
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
