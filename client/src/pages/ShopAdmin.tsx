import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ExternalLink, MousePointerClick, Package, Trophy } from 'lucide-react';
const categories = ['Wellness', 'Kitchen', 'Yoga', 'Home', 'Books', 'Beauty', 'Lifestyle'];
export default function ShopAdmin() {
  const { user } = useAuth(); const queryClient = useQueryClient();
  const [url, setUrl] = useState(''); const [category, setCategory] = useState('Wellness'); const [error, setError] = useState('');
  const { data, isLoading } = useQuery<any>({ queryKey: ['/api/shop/admin'], enabled: user?.role === 'admin' });
  const addMutation = useMutation({ mutationFn: async () => (await apiRequest('POST', '/api/shop/products', { affiliateUrl: url, category })).json(), onSuccess: () => { setUrl(''); setError(''); queryClient.invalidateQueries({ queryKey: ['/api/shop/admin'] }); queryClient.invalidateQueries({ queryKey: ['/api/shop/products'] }); }, onError: (e: any) => setError(e.message?.replace(/^\d+:\s*/, '') || 'Could not add product') });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => apiRequest('DELETE', `/api/shop/products/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/shop/admin'] }); queryClient.invalidateQueries({ queryKey: ['/api/shop/products'] }); } });
  if (user?.role !== 'admin') return <AppLayout><div className="p-10 text-center">Access denied.</div></AppLayout>;
  const summary = data?.summary || { products: 0, clicks: 0, topProduct: '' };
  return <AppLayout><div className="space-y-6">
    <div><h1 className="text-3xl font-serif font-bold">TrueVedika Shop</h1><p className="text-muted-foreground">Add affiliate links and see what your audience clicks.</p></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-4 pt-6"><Package className="h-8 w-8 text-[#55755a]" /><div><p className="text-sm text-muted-foreground">Products</p><p className="text-2xl font-bold">{summary.products}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 pt-6"><MousePointerClick className="h-8 w-8 text-[#55755a]" /><div><p className="text-sm text-muted-foreground">Total clicks</p><p className="text-2xl font-bold">{summary.clicks}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 pt-6"><Trophy className="h-8 w-8 text-[#55755a]" /><div><p className="text-sm text-muted-foreground">Top product</p><p className="max-w-[180px] truncate text-lg font-bold">{summary.topProduct || '—'}</p></div></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Add a product</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste your affiliate product link" type="url" />
      <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      <Button disabled={!url || addMutation.isPending} onClick={() => addMutation.mutate()}>{addMutation.isPending ? 'Adding…' : 'Add product'}</Button></div>
      <p className="text-xs text-muted-foreground">The product name and image are read automatically when the retailer provides them.</p>{error && <p className="text-sm text-destructive">{error}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Products</CardTitle></CardHeader><CardContent>{isLoading ? <p>Loading…</p> : <div className="space-y-2">{(data?.products || []).map((p: any) => <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3"><img src={p.image} className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} · {p.clicks} clicks</p></div><a href={p.affiliateUrl} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></a><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div>}</CardContent></Card>
  </div></AppLayout>;
}
