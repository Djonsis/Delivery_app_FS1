# **App Name**: FastBasket

## Core Features:

- Product Catalog: Display product catalog with categories and search functionality.
- Shopping Cart: Allow users to add products to a cart, view the cart contents, and adjust quantities.
- Checkout Initiation: Enable users to initiate the checkout process, see the pre-edited order total, but without immediate payment processing.
- Data Management: Store and manage product data, user carts, and order information in Firestore.
- User Authentication: Handle user authentication using Firebase Authentication.
- Order Processing: Utilize Cloud Functions to manage order processing, including adjustments and payment link generation (SBP payments only).
- Notifications: Notify users about order updates and payment links via Firebase Cloud Messaging.
- Admin Order Modification: Enable the admin to modify order details (items, quantity, price) before payment.
- Source Tracking: Capture the user's entry source (QR code, UTM, direct) and include it in the order data.
- Offline Access: Make the product catalog accessible offline after the first visit, updating data when online.

## Style Guidelines:

- Use pastel tones in a blue gradient palette for a soft, friendly, and professional look.
- Maintain a unified color palette for all UI elements.
- Avoid excessively bright or neon colors to ensure a professional and calming aesthetic.
- Font: 'Inter', a sans-serif font that provides a clean, modern look, suitable for both headings and body text, ensuring readability and consistency across the app.
- Consistent use of TailwindCSS and Shadcn/ui components for a uniform and responsive design.
- Simple, recognizable icons for navigation and product categories to enhance usability.
- Subtle animations and transitions to improve user experience, such as loading indicators and cart updates.
- Vertical product card layout with image, price, name, weight/quantity, rating, and 'Add to Cart' button or quantity adjuster.
- Product card background should use pastel tones in a blue gradient.
- Image corners should be rounded.