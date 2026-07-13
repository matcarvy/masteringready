export type CheckoutProductType = 'pro_monthly' | 'single' | 'addon'

export async function startCheckout(
  productType: CheckoutProductType,
  countryCode: string | undefined,
  accessToken: string | undefined,
  lang: 'es' | 'en' = 'en'
): Promise<void> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` })
    },
    body: JSON.stringify({ productType, countryCode, lang })
  })

  const data = await response.json()

  if (!data?.url) {
    throw new Error('Checkout session did not return a redirect URL')
  }

  window.location.href = data.url
}
