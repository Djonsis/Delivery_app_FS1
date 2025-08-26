

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Order, OrderStatus, ORDER_STATUSES } from "@/lib/types";
import { updateOrderStatus } from "./_actions/update-order-status";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    // TODO: Replace with actual data fetching from API
    setOrders([]);
    setLoading(false);
  }, []);
  
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const originalStatus = orders.find(o => o.id === orderId)?.status;
    
    // Optimistically update UI
    setOrders(prevOrders => 
      prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );

    startTransition(async () => {
      try {
        // await updateOrderStatus(orderId, newStatus);
        toast({
          title: "Статус обновлен",
          description: `Статус заказа #${orderId.substring(0,6)} изменен на "${newStatus}".`,
        });
      } catch (error) {
        // Revert UI on error
        if (originalStatus) {
            setOrders(prevOrders => 
              prevOrders.map(o => o.id === orderId ? { ...o, status: originalStatus } : o)
            );
        }
        toast({
          title: "Ошибка",
          description: "Не удалось обновить статус заказа.",
          variant: "destructive",
        });
        console.error(error);
      }
    });
  };

  if (loading) {
    return <div>Загрузка заказов...</div>;
  }

  return (
    <div className="border rounded-lg p-2">
      <Table>
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
              <TableCell>{order.customer}</TableCell>
              <TableCell>{new Date(order.date).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>{order.total.toFixed(2)} ₽</TableCell>
              <TableCell>
                <Select
                  value={order.status}
                  onValueChange={(newStatus: OrderStatus) => handleStatusChange(order.id, newStatus)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[180px]">
                     <SelectValue>
                         <Badge 
                            variant={
                                order.status === 'Выполнен' ? 'default' : 
                                order.status === 'Отменен' ? 'destructive' : 'secondary'
                            }
                            className="mr-2"
                         >
                            {order.status}
                        </Badge>
                     </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {orders.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пока нет ни одного заказа.</p>
          </div>
        )}
    </div>
  );
}
