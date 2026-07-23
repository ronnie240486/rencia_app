import { createConnection } from 'mysql2/promise';
import crypto from 'crypto';

const connection = await createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'test',
});

try {
  // Gerar openId único
  const openId = crypto.randomUUID();
  
  // Inserir usuário
  const [userResult] = await connection.execute(
    'INSERT INTO users (openId, email, name, role) VALUES (?, ?, ?, ?)',
    [openId, 'ronnie240486@gmail.com', 'Ronnie', 'admin']
  );
  
  const userId = userResult.insertId;
  console.log('✅ Usuário criado com ID:', userId);
  
  // Gerar hash da senha
  const passwordHash = crypto.createHash('sha256').update('123456').digest('hex');
  
  // Inserir credenciais locais
  await connection.execute(
    'INSERT INTO local_credentials (userId, email, passwordHash) VALUES (?, ?, ?)',
    [userId, 'ronnie240486@gmail.com', passwordHash]
  );
  
  console.log('✅ Credenciais inseridas com sucesso!');
  console.log('📧 Email: ronnie240486@gmail.com');
  console.log('🔑 Senha: 123456');
  
} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}
