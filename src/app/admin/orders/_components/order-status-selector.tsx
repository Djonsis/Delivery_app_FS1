
"use client";

import { useState, useTransition } from "react";
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
import { isFinalStatus, statusColors } from "@/lib/orders.utils";

interface OrderStatusSelectorProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export default function OrderStatusSelector({ orderId, currentStatus }: OrderStatusSelectorProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleChange = (newStatus: OrderStatus) => {
    setStatus(newStatus); // Оптимистичное обновление
    startTransition(async () => {
      try {
        const result = await updateOrderStatusAction(orderId, newStatus);
        if (!result.success) {
          throw new Error(result.message);
        }

        toast({
          title: "Статус обновлен",
          description: `Статус заказа #${orderId.substring(0, 6)} изменен на "${newStatus}".`,
        });
      } catch (error) {
        setStatus(currentStatus); // Откат при ошибке
        toast({
          title: "Ошибка",
          description: (error as Error).message || "Не удалось обновить статус заказа.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Select
      value={status}
      onValueChange={handleChange}
      disabled={isPending || isFinalStatus(status)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue>
          <Badge variant={statusColors[status]}>
            {status}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((statusOption) => (
          <SelectItem key={statusOption} value={statusOption}>
             <Badge variant={statusColors[statusOption]}>
                {statusOption}
              </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
