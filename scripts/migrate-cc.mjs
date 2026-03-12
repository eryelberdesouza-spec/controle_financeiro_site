import mysql2 from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

try {
  // 1. Modificar enum tipo em centros_custo para incluir 'investimento'
  await conn.execute(`ALTER TABLE centros_custo MODIFY COLUMN tipo enum('operacional','administrativo','contrato','projeto','investimento','outro') NOT NULL DEFAULT 'operacional'`);
  console.log('✓ tipo enum atualizado em centros_custo');

  // 2. Adicionar responsavel se não existir
  const [cols] = await conn.execute('DESCRIBE centros_custo');
  const campos = cols.map(r => r.Field);

  if (!campos.includes('responsavel')) {
    await conn.execute('ALTER TABLE centros_custo ADD responsavel varchar(150)');
    console.log('✓ responsavel adicionado em centros_custo');
  } else {
    console.log('- responsavel já existe em centros_custo');
  }

  if (!campos.includes('observacoes')) {
    await conn.execute('ALTER TABLE centros_custo ADD observacoes text');
    console.log('✓ observacoes adicionado em centros_custo');
  } else {
    console.log('- observacoes já existe em centros_custo');
  }

  // 3. Adicionar centroCustoId em ordens_servico se não existir
  const [osCols] = await conn.execute('DESCRIBE ordens_servico');
  const osCampos = osCols.map(r => r.Field);

  if (!osCampos.includes('centroCustoId')) {
    await conn.execute('ALTER TABLE ordens_servico ADD centroCustoId int');
    await conn.execute('ALTER TABLE ordens_servico ADD CONSTRAINT ordens_servico_centroCustoId_fk FOREIGN KEY (centroCustoId) REFERENCES centros_custo(id)');
    console.log('✓ centroCustoId adicionado em ordens_servico');
  } else {
    console.log('- centroCustoId já existe em ordens_servico');
  }

  console.log('\n✅ Migração concluída com sucesso!');
} catch (e) {
  console.error('❌ Erro:', e.message);
  process.exit(1);
} finally {
  await conn.end();
}
