# Pipeline QDIA Export — 5 étapes guidées
# Prérequis: API sur :8080, OPENAI_API_KEY et DATABASE_URL configurés

$BaseUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:8080" }

Write-Host "=== Étape 1/5 : Assistant IA (chat streaming) ===" -ForegroundColor Cyan
$chatBody = @{
  message = "Je veux exporter mon huile d'olive extra vierge de Béjaïa vers la France. Quelles certifications UE me faut-il ?"
  history = @()
} | ConvertTo-Json

$chatResp = Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat" -Method POST -Body $chatBody -ContentType "application/json" -UseBasicParsing
Write-Host "Chat OK — réponse reçue ($($chatResp.Content.Length) octets)"

Write-Host "`n=== Étape 2/5 : Fiche Produit (GPT-4o) ===" -ForegroundColor Cyan
$genBody = @{
  description = "Huile d'olive extra vierge première pression à froid, wilaya de Béjaïa, acidité < 0.8%, bouteilles verre 750ml"
  target_market = "FR"
  cost_dzd = 450
} | ConvertTo-Json

$product = Invoke-RestMethod -Uri "$BaseUrl/api/ai/generate-product" -Method POST -Body $genBody -ContentType "application/json"
Write-Host "Produit: $($product.name_fr) | Catégorie: $($product.category)"

Write-Host "`n=== Étape 3/5 : Pricing Export (Incoterms + benchmark IA) ===" -ForegroundColor Cyan
$pricingBody = @{
  product_name = $product.name_fr
  cost_dzd = 450
  quantity = 1000
  quantity_unit = "kg"
  destination_country = "FR"
  vendor_margin_pct = 15
  packaging_cost_dzd = 25
  local_transport_dzd = 50
} | ConvertTo-Json

$pricing = Invoke-RestMethod -Uri "$BaseUrl/api/ai/calculate-pricing" -Method POST -Body $pricingBody -ContentType "application/json"
Write-Host "FOB: `$$($pricing.fob_usd) USD / €$($pricing.fob_eur) EUR | CIF: `$$($pricing.cif_usd) USD / €$($pricing.cif_eur) EUR"

Write-Host "`n=== Étape 4/5 : Studio Image IA (optionnel — nécessite une image) ===" -ForegroundColor Cyan
Write-Host "Studio ignoré si pas d'image locale. Uploadez via /agent-ia étape 4."

Write-Host "`n=== Étape 5/5 : Publication (soumission revue QDIA) ===" -ForegroundColor Cyan
$publishBody = @{
  name = $product.name_fr
  description = "$($product.description_fr)`n`nEN: $($product.description_en)"
  category = $product.category
  moq = $product.suggested_moq
  moq_unit = $product.suggested_moq_unit
  port_depart = $product.suggested_port
  certifications = $product.certifications
  prices = @{
    exw = $pricing.exw_usd
    fob = $pricing.fob_usd
    cfr = $pricing.cfr_usd
    cif = $pricing.cif_usd
    currency = "USD"
    unit = "per kg"
  }
  target_markets = @("FR")
  export_status = "pending"
} | ConvertTo-Json -Depth 5

$published = Invoke-RestMethod -Uri "$BaseUrl/api/products" -Method POST -Body $publishBody -ContentType "application/json"
Write-Host "Produit soumis ! ID: $($published.id) | Statut: $($published.export_status)" -ForegroundColor Green
