import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const orders = [
  {
    id: "ORD001",
    customer: "Liam Johnson",
    date: "2023-07-15",
    total: 250.00,
    status: "Fulfilled",
  },
  {
    id: "ORD002",
    customer: "Olivia Smith",
    date: "2023-07-16",
    total: 150.75,
    status: "Pending",
  },
  {
    id: "ORD003",
    customer: "Noah Williams",
    date: "2023-07-17",
    total: 350.50,
    status: "Fulfilled",
  },
  {
    id: "ORD004",
    customer: "Emma Brown",
    date: "2023-07-18",
    total: 450.00,
    status: "Cancelled",
  },
    {
    id: "ORD005",
    customer: "Ava Jones",
    date: "2023-07-19",
    total: 550.00,
    status: "Pending",
  },
];


export default function OrdersPage() {
  return (
    <div className="border rounded-lg p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={
                    order.status === 'Fulfilled' ? 'default' : 
                    order.status === 'Pending' ? 'secondary' : 'destructive'
                  }>
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}
