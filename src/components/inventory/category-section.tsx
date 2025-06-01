import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategorySectionProps } from '@/types/inventory'
import { ProductInput } from './product-input'

export function CategorySection({ category, formData, onChange, errors }: CategorySectionProps) {
  if (!category.products || category.products.length === 0) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-primary">
          {category.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {category.products.map((product) => (
          <ProductInput
            key={product.id}
            product={product}
            value={formData[product.id]}
            onChange={onChange}
            error={errors?.[product.id]}
          />
        ))}
      </CardContent>
    </Card>
  )
} 