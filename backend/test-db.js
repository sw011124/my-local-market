// backend/test-db.js
const { Client } = require('pg');

// 우리가 설정한 정보 (postgres / postgres / 5433)
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/market',
});

async function testConnection() {
  try {
    console.log('📡 접속 시도 중...');
    await client.connect();
    console.log('✅ 성공! 데이터베이스에 연결되었습니다.');

    const res = await client.query('SELECT NOW()');
    console.log('🕒 현재 DB 시간:', res.rows[0]);

    await client.end();
  } catch (err) {
    console.error('❌ 실패 원인:', err.message);
    console.error('힌트:', err.code); // 에러 코드 확인
  }
}

testConnection();
