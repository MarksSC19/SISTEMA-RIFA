import { AdminUser, Ticket } from '../types';
export function adminMetrics(admins: AdminUser[], tickets: Ticket[], raffleId: string) {
  return admins.filter(a=>a.assignedRaffleId===raffleId||tickets.some(t=>t.sellerAdminId===a.id&&t.raffleId===raffleId)).map(admin=>{
    const sales=tickets.filter(t=>t.sellerAdminId===admin.id&&t.raffleId===raffleId&&t.isValid!==false&&t.status!=='cancelled');
    return {...admin,totalSold:sales.length,totalCollected:sales.reduce((sum,t)=>sum+Number(t.price||0),0)};
  });
}
export function activeSellers(admins: AdminUser[]) {
  // The supervisor has a sales booklet too, so their active quota is included.
  return admins.filter(a=>!a.archivedAt&&a.status==='activo');
}
