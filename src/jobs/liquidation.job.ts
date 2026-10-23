import cron from 'node-cron';
import { prisma } from '../config/database';
import { LotService } from '../services/lot.service';

const lotService = new LotService();

export function startLiquidationJob() {
  console.log('Cron Job de Liquidação iniciado (Rodando a cada 1 minuto)...');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const expiredLots = await prisma.lot.findMany({
        where: {
          endTime: { lte: now },
          status: 'LIVE',
        },
      });

      if (expiredLots.length > 0) {
        console.log(`Encontrados ${expiredLots.length} lote(s) expirado(s). Iniciando liquidação...`);

        for (const lot of expiredLots) {
          try {
            await lotService.liquidateLot(lot.id);
            console.log(`Lote ${lot.id} liquidado com sucesso.`);
          } catch (error: any) {
            console.error(`Erro ao liquidar lote ${lot.id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Erro na varredura do Cron Job:', error);
    }
  });
}