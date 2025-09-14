
"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OrderStatus, ORDER_STATUSES } from "@/lib/types";
import { updateOrderStatusAction } from "../_actions/update-order-status";
import { useToast } from "@/hooks/use-toast";

interface OrderStatusSelectorProps {
  orderId: string;
  currentStatus: OrderStatus;
}

const statusColors: Record<OrderStatus, "default" | "secondary" | "destructive"> = {
    "Новый заказ": "secondary",
    "Собирается": "secondary",
    "Ожидает курьера": "secondary",
    "Передан в доставку": "secondary",
    "Выполнен": "default",
    "Отменен": "destructive",
};


export default function OrderStatusSelector({ orderId, currentStatus }: OrderStatusSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: OrderStatus) => {
    startTransition(async () => {
      try {
        const result = await updateOrderStatusAction(orderId, newStatus);
        if (!result.success) {
          throw new Error(result.message);
        }
        toast({
          title: "Статус обновлен",
          description: `Статус заказа #${orderId.substring(0,6)} изменен на "${newStatus}".`,
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: (error as Error).message || "Не удалось обновить статус заказа.",
          variant: "destructive",
        });
      }
    });
  };

  const isFinalStatus = currentStatus === 'Выполнен' || currentStatus === 'Отменен';

  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={(newStatus: OrderStatus) => handleStatusChange(newStatus)}
      disabled={isPending || isFinalStatus}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <Badge
            variant={statusColors[currentStatus]}
            className="mr-2"
          >
            {currentStatus}
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
  );
}
