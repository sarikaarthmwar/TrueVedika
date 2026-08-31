CREATE TABLE IF NOT EXISTS shop_products (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image text NOT NULL,
  category text NOT NULL,
  affiliate_url text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
