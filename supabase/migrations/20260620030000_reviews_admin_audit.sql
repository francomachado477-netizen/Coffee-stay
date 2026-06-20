-- Complete reviews data model for real customer feedback.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT 'Guest',
  ADD COLUMN IF NOT EXISTS comment text NOT NULL DEFAULT '';

UPDATE public.reviews
SET comment = 'Legacy rating-only review'
WHERE length(trim(comment)) = 0;

UPDATE public.reviews
SET customer_name = 'Guest'
WHERE length(trim(customer_name)) = 0;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_customer_name_not_blank CHECK (length(trim(customer_name)) > 0) NOT VALID,
  ADD CONSTRAINT reviews_comment_not_blank CHECK (length(trim(comment)) > 0) NOT VALID;

ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_customer_name_not_blank;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_comment_not_blank;

DROP POLICY IF EXISTS "Anyone submits review" ON public.reviews;
CREATE POLICY "Anyone submits review"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(trim(customer_name)) > 0
    AND length(trim(comment)) > 0
  );

DROP POLICY IF EXISTS "Anyone reads public reviews" ON public.reviews;
CREATE POLICY "Anyone reads public reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);
