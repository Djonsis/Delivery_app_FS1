
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getOrders } from "@/lib/orders.service";
import OrderStatusSelector from "./_components/order-status-selector";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="border rounded-lg p-2">
      <Table>
        <TableCaption>Список последних заказов.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Заказ</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">#{order.id.substring(0, 6)}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell>{new Date(order.created_at).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>{Number(order.total_amount).toFixed(2)} ₽</TableCell>
              <TableCell>
                <OrderStatusSelector orderId={order.id} currentStatus={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пока нет ни одного заказа.</p>
          </div>
        )}
    </div>
  );
}
