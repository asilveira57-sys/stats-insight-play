
-- Temporarily disable the slug immutability trigger to fix incorrect slug
ALTER TABLE public.ligas DISABLE TRIGGER trigger_set_liga_slug;

UPDATE public.ligas SET slug = 'usl-championship' WHERE id = '2f680751-21ff-4e2d-91e4-b809f965a435';

ALTER TABLE public.ligas ENABLE TRIGGER trigger_set_liga_slug;
