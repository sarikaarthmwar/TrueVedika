import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Leaf, Sparkles } from 'lucide-react';

interface ShopProduct { id: string; name: string; image: string; category: string; clicks: number; }

export default function Shop() {
  const { data: products = [], isLoading } = useQuery<ShopProduct[]>({ queryKey: ['/api/shop/products'] });
  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#304233]">
      <header className="mx-auto max-w-5xl px-5 pt-10 pb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6efe2]"><Leaf className="h-8 w-8 text-[#55755a]" /></div>
        <p className="text-sm font-medium tracking-[0.25em] uppercase text-[#71856f]">TrueVedika</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">TrueVedika Shop</h1>
        <p className="mx-auto mt-3 max-w-xl text-[#68736a]">Thoughtfully curated finds for mindful, traditional living.</p>
        <p className="mt-2 text-sm font-medium text-[#55755a]">Back to Roots 🌿</p>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        {isLoading ? <div className="py-16 text-center text-[#68736a]">Loading curated finds…</div> : products.length === 0 ? (
          <div className="rounded-3xl border border-[#e3e7df] bg-white p-12 text-center shadow-sm"><Sparkles className="mx-auto mb-3 h-7 w-7 text-[#71856f]" /><p className="font-medium">Our first collection is coming soon.</p></div>
        ) : <>
          <div className="mb-8 flex flex-wrap justify-center gap-2">{categories.map((category) => <a key={category} href={`#${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-[#e3e7df] transition hover:bg-[#f0f5ed]">{category}</a>)}</div>
          {categories.map((category) => <section key={category} id={category.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="mb-10 scroll-mt-6">
            <h2 className="mb-4 font-serif text-2xl font-semibold">{category}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {products.filter((p) => p.category === category).map((product) => <a key={product.id} href={`/api/shop/products/${product.id}/click`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e8e1] transition hover:-translate-y-1 hover:shadow-md">
                <div className="aspect-square overflow-hidden bg-[#f2f1ec]"><img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></div>
                <div className="p-3"><h3 className="line-clamp-2 text-sm font-medium leading-5">{product.name}</h3><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#55755a]">View product <ExternalLink className="h-3 w-3" /></span></div>
              </a>)}
            </div>
          </section>)}
        </>}
      </main>
    </div>
  );
}
