import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>
            Здесь вы можете просмотреть и отредактировать информацию о своем профиле.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name">Имя</label>
            <p id="name" className="font-semibold">John Doe</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="email">Email</label>
            <p id="email" className="font-semibold">john.doe@example.com</p>
          </div>
          <Button>Редактировать профиль</Button>
        </CardContent>
      </Card>
    </div>
  )
}
