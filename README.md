# AEROVA Frontend

Statik HTML, CSS və JavaScript saytıdır (build addımı yoxdur). API ayrı repo-dadır: **Airline-Reservation-System-Backend**.

## Açmaq
Repo-nu clone edin və **repo kökünü** (`index.html` olan qovluq) `http://localhost:5500` ünvanından verin. Seçimlərdən biri:

```bash
# Python (ayrıca quraşdırma tələb etmir)
python -m http.server 5500 --bind 127.0.0.1

# Node.js
npx serve -l 5500 .
```

VS Code **Live Server** işlədirsinizsə, qovluq kimi məhz bu repo qovluğunu (içində `index.html` olan) açın və portu `5500` edin.

Səhifəni faylı iki dəfə klikləyib (`file://…`) açmayın: brauzer API sorğularını bloklayır.

## Port və ünvanlar
| Nə | Ünvan |
| --- | --- |
| Frontend | `http://localhost:5500` (və ya `http://127.0.0.1:5500`) |
| API | `http://localhost:5080` |

Backend CORS yalnız bu iki frontend ünvanına icazə verir. Başqa portdan istifadə edəcəksinizsə, backend-də `Cors:AllowedOrigins` və `Auth:FrontendBaseUrl` dəyərlərini də dəyişin.

API ünvanı mərkəzi olaraq `assets/js/api-config.js` faylındadır (`baseUrl`). Başqa ünvan üçün hər səhifədən əvvəl `window.AEROVA_API = { baseUrl: "http://…" }` təyin edilə bilər.

## "Cannot GET /payment-success.html" kimi xəta
Bu, serverin göstərdiyi qovluqda həmin fayl olmadığını bildirir, koddakı xəta deyil. Yoxlayın:

1. Server məhz bu repo qovluğunu göstərir? `http://localhost:5500/index.html` açılır və `README.md` ilə yanaşı olan qovluqdur.
2. Nüsxə yenidir? Aşağıdakı əmrlər `master` branch-də olduğunuzu və ən son commit-i aldığınızı göstərir:

```bash
git status
git pull
```

3. Sayt alt qovluqdan açılıbsa (ünvanda `5500/` ilə `index.html` arasında qovluq adı varsa), Stripe-dan qayıdış `payment.js`-in göndərdiyi qovluq yolu ilə gedir. Ən sadəsi yenə də repo qovluğunu sayt kökü kimi açmaqdır.
4. `payment-success.html`, `payment-cancel.html`, `cancel-confirm.html`, `confirm-booking.html`, `account-delete-confirm.html` kimi səhifələr 27 Oktyabr 2026-dan sonra əlavə olunub. Köhnə nüsxədə (ZIP, köhnə clone) bu səhifələr olmur, ödəniş qayıdışı və e-poçt linkləri isə onlara yönəlir.

## Səhifələr
Bron axını: `index` / `flight-results` → `flight-details` → `seat-selection` → `passenger-details` → `baggage-selection` → `meal-selection` → `payment` (Stripe Checkout) → `payment-success` (və ya `payment-cancel`) → `confirmation`. `my-trips` və `booking-details` mövcud bronlara baxış üçündür. Giriş tələb edən səhifələr giriş olmadıqda `login.html`-ə yönləndirir.
