import ProductForm from "../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProductPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Product</CardTitle>
        <CardDescription>
          Fill out the form below to add a new product to your store.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm />
      </CardContent>
    </Card>
  );
}
