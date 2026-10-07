# -*- coding: utf-8 -*-
"""Add remaining UI strings to locales and retag HTML."""
from pathlib import Path
import re
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LOC = ROOT / "assets" / "js" / "locales"

# English -> (az, ru) for remaining unmarked UI (skip proper place names / sample data)
PAIRS = {
    "+ Add Flight": ("+ Uçuş əlavə et", "+ Добавить рейс"),
    "0 of 1 seats selected": ("1 yerdən 0 oturacaq seçildi", "Выбрано 0 из 1 мест"),
    "1 Passenger": ("1 sərnişin", "1 пассажир"),
    "2 Passengers": ("2 sərnişin", "2 пассажира"),
    "3 Passengers": ("3 sərnişin", "3 пассажира"),
    "4 Passengers": ("4 sərnişin", "4 пассажира"),
    "5 Passengers": ("5 sərnişin", "5 пассажиров"),
    "6 Passengers": ("6 sərnişin", "6 пассажиров"),
    "7 Passengers": ("7 sərnişin", "7 пассажиров"),
    "8 Passengers": ("8 sərnişin", "8 пассажиров"),
    "9 Passengers": ("9 sərnişin", "9 пассажиров"),
    "1 × 23 kg checked bag": ("1 × 23 kq baqaj", "1 × 23 кг багаж"),
    "2 × 32 kg checked bags": ("2 × 32 kq baqaj", "2 × 32 кг багаж"),
    "24/7 Support": ("24/7 dəstək", "Поддержка 24/7"),
    "A clear path from search to seat — designed to feel intuitive at every step.": (
        "Axtarışdan oturacağa qədər aydın yol — hər addımda intuitiv.",
        "Ясный путь от поиска до места — интуитивно на каждом шаге.",
    ),
    "AEROVA combines effortless booking, flexible travel management and premium service.": (
        "AEROVA asan bron, çevik idarəetmə və premium xidməti birləşdirir.",
        "AEROVA объединяет простое бронирование, гибкое управление и премиальный сервис.",
    ),
    "About the Destination": ("İstiqamət haqqında", "О направлении"),
    "Airport Location": ("Hava limanı ünvanı", "Расположение аэропорта"),
    "Allowance": ("Limit", "Норма"),
    "Attentive Service": ("Diqqətli xidmət", "Внимательный сервис"),
    "Availability": ("Mövcudluq", "Доступность"),
    "Available Departures": ("Mövcud uçuşlar", "Доступные вылеты"),
    "Back to My Trips": ("Səyahətlərimə qayıt", "Назад к поездкам"),
    "Baggage Summary": ("Baqaj xülasəsi", "Сводка багажа"),
    "Baggage Total": ("Baqaj cəmi", "Итого багаж"),
    "Baggage allowance": ("Baqaj norması", "Норма багажа"),
    "Base Fare": ("Baza tarif", "Базовый тариф"),
    "Begin a Journey That Feels Considered": ("Düşünülmüş səyahətə başlayın", "Начните продуманное путешествие"),
    "Begin your AEROVA flight from Baku with calm precision.": (
        "Bakıdan AEROVA uçuşuna sakit dəqiqliklə başlayın.",
        "Начните рейс AEROVA из Баку со спокойной точностью.",
    ),
    "Best Value": ("Ən sərfəli", "Лучшая цена"),
    "Booking Overview": ("Bron icmalı", "Обзор бронирования"),
    "Business Seats": ("Biznes oturacaqları", "Места бизнес-класса"),
    "By clicking Pay, you agree to the terms and conditions.": (
        "Ödənişə klikləməklə şərtləri qəbul edirsiniz.",
        "Нажимая «Оплатить», вы принимаете условия.",
    ),
    "Cabins Designed for the Way You Travel": ("Səyahət tərzinizə uyğun salonlar", "Салоны под ваш стиль путешествий"),
    "Cancellation fee applies": ("Ləğvetmə haqqı tətbiq olunur", "Взимается сбор за отмену"),
    "Cancellation policy": ("Ləğvetmə qaydaları", "Правила отмены"),
    "Cardholder Name": ("Kart sahibinin adı", "Имя владельца карты"),
    "Champagne-gold details, considered cabins, and dining that respects both appetite and altitude. AEROVA is premium travel refined to its essentials.": (
        "Şampan-qızıl detallar, düşünülmüş salonlar və yüksəkliyə uyğun yeməklər. AEROVA — mahiyyətinə qədər cilalanmış premium səyahət.",
        "Шампанско-золотые детали, продуманные салоны и кухня с учётом высоты. AEROVA — премиум, доведённый до сути.",
    ),
    "Change policy": ("Dəyişiklik qaydaları", "Правила изменений"),
    "Changes from $60": ("Dəyişikliklər $60-dan", "Изменения от $60"),
    "Check the latest status of your AEROVA flight.": (
        "AEROVA uçuşunuzun son statusunu yoxlayın.",
        "Проверьте актуальный статус рейса AEROVA.",
    ),
    "Choose a dining preference for each passenger before you continue.": (
        "Davam etməzdən əvvəl hər sərnişin üçün yemək seçin.",
        "Перед продолжением выберите питание для каждого пассажира.",
    ),
    "Choose the atmosphere that suits your journey — essential comfort, elevated space, or refined repose.": (
        "Səyahətinizə uyğun atmosfer seçin — əsas rahatlıq, geniş məkan və ya zərif istirahət.",
        "Выберите атмосферу путешествия — базовый комфорт, больше пространства или изысканный покой.",
    ),
    "Choose your cabin, set your course, and travel with the composure AEROVA is known for.": (
        "Salonunuzu seçin, istiqamətinizi müəyyənləşdirin və AEROVA-nın sakit rahatlığı ilə səyahət edin.",
        "Выберите салон, задайте маршрут и путешествуйте с характерным спокойствием AEROVA.",
    ),
    "Choose your preferred seat before you travel.": (
        "Səyahətdən əvvəl üstünlük verdiğiniz oturacağı seçin.",
        "Выберите предпочтительное место до вылета.",
    ),
    "Choose your preferred seat for your journey.": (
        "Səyahətiniz üçün oturacaq seçin.",
        "Выберите место для вашего путешествия.",
    ),
    "Clear Notifications": ("Bildirişləri təmizlə", "Очистить уведомления"),
    "Click an available seat to cycle its state.": (
        "Statusunu dəyişmək üçün mövcud oturacağa klikləyin.",
        "Нажмите доступное место, чтобы сменить его статус.",
    ),
    "Comfort Seats": ("Komfort oturacaqları", "Места Comfort"),
    "Compare cabins side by side and choose the experience that fits your journey.": (
        "Salonları müqayisə edin və səyahətinizə uyğun təcrübəni seçin.",
        "Сравните салоны и выберите опыт, подходящий вашему путешествию.",
    ),
    "Compare starting fares across the month, then search with your chosen departure date.": (
        "Ay ərzində başlanğıc qiymətləri müqayisə edin, sonra seçdiyiniz tarixlə axtarın.",
        "Сравните стартовые тарифы за месяц и ищите с выбранной датой вылета.",
    ),
    "Complete your payment securely to confirm your reservation.": (
        "Rezervasiyanı təsdiqləmək üçün ödənişi təhlükəsiz tamamlayın.",
        "Безопасно завершите оплату, чтобы подтвердить бронирование.",
    ),
    "Completed journeys will appear here once you have flown with AEROVA.": (
        "AEROVA ilə uçduqdan sonra tamamlanmış səyahətlər burada görünəcək.",
        "Завершённые поездки появятся здесь после полётов с AEROVA.",
    ),
    "Confirm Cancellation": ("Ləğvi təsdiqlə", "Подтвердить отмену"),
    "Continue to Baggage": ("Baqaja davam et", "К выбору багажа"),
    "Continue to Extra Services": ("Əlavə xidmətlərə davam et", "К доп. услугам"),
    "Continue to Meal Selection": ("Yemək seçiminə davam et", "К выбору питания"),
    "Countries": ("Ölkələr", "Страны"),
    "Crew and ground teams trained to anticipate, not interrupt, your rhythm of travel.": (
        "Ekipaj və yer heyəti səyahət ritminizi pozmadan qabaqlamağa öyrədilib.",
        "Экипаж и наземные команды обучены предугадывать, а не прерывать ваш ритм.",
    ),
    "Current Selection": ("Cari seçim", "Текущий выбор"),
    "Current Total": ("Cari cəm", "Текущая сумма"),
    "Destination Not Found": ("İstiqamət tapılmadı", "Направление не найдено"),
    "Dining, entertainment, and lounge moments curated to feel unhurried and distinctly AEROVA.": (
        "Yemək, əyləncə və zal anları — tələskənliksiz və tipik AEROVA ruhunda.",
        "Питание, развлечения и лаунж — без спешки и в духе AEROVA.",
    ),
    "Discover": ("Kəşf et", "Открыть"),
    "Discover Your Next Destination": ("Növbəti istiqamətinizi kəşf edin", "Откройте следующее направление"),
    "Easy Booking": ("Asan bron", "Простое бронирование"),
    "Economy Seats": ("Ekonom oturacaqları", "Места эконом-класса"),
    "Enhance your journey with optional upgrades before payment.": (
        "Ödənişdən əvvəl istəyə bağlı yeniləmələrlə səyahəti zənginləşdirin.",
        "Дополните путешествие опциями до оплаты.",
    ),
    "Enhanced meal and priority boarding": ("Təkmilləşdirilmiş yemək və prioritet miniş", "Улучшенное питание и приоритетная посадка"),
    "Enter seat codes separated by commas. Match the passenger count.": (
        "Oturacaq kodlarını vergüllə daxil edin. Sərnişin sayına uyğun olsun.",
        "Введите коды мест через запятую. Число должно совпадать с пассажирами.",
    ),
    "Enter the details exactly as they appear on your confirmation.": (
        "Məlumatları təsdiqdə göründüyü kimi daxil edin.",
        "Введите данные точно как в подтверждении.",
    ),
    "Enter the passenger information required for your journey.": (
        "Səyahət üçün tələb olunan sərnişin məlumatlarını daxil edin.",
        "Введите данные пассажиров, необходимые для поездки.",
    ),
    "Essential comfort for every journey": ("Hər səyahət üçün əsas rahatlıq", "Базовый комфорт для каждого путешествия"),
    "Estimated New Total": ("Təxmini yeni cəm", "Ориентировочная новая сумма"),
    "Expiry Date": ("Bitmə tarixi", "Срок действия"),
    "Explore Destinations": ("İstiqamətləri kəşf et", "Смотреть направления"),
    "Explore the World": ("Dünyanı kəşf et", "Исследуйте мир"),
    "Extra Baggage Preference": ("Əlavə baqaj seçimi", "Предпочтение по доп. багажу"),
    "Extra Services Summary": ("Əlavə xidmətlər xülasəsi", "Сводка доп. услуг"),
    "Extra Services Total": ("Əlavə xidmətlər cəmi", "Итого доп. услуги"),
    "Fare Options": ("Tarif seçimləri", "Варианты тарифов"),
    "Find Your Booking": ("Bronunuzu tapın", "Найдите бронирование"),
    "Find and book your next flight in just a few steps.": (
        "Növbəti uçuşunuzu bir neçə addımda tapın və bron edin.",
        "Найдите и забронируйте следующий рейс за несколько шагов.",
    ),
    "Find the best fare by date": ("Tarixə görə ən yaxşı tarifi tapın", "Найдите лучший тариф по дате"),
    "Fine dining and lounge access": ("Zərif yemək və zal girişi", "Изысканное питание и доступ в лаунж"),
    "Flexible Dates": ("Çevik tarixlər", "Гибкие даты"),
    "Flexible Journeys": ("Çevik səyahətlər", "Гибкие поездки"),
    "Flexible changes included": ("Çevik dəyişikliklər daxildir", "Гибкие изменения включены"),
    "Flight 1": ("Uçuş 1", "Рейс 1"),
    "Flight 2": ("Uçuş 2", "Рейс 2"),
    "Flight Status": ("Uçuş statusu", "Статус рейса"),
    "Flight Timeline": ("Uçuş cədvəli", "Хронология рейса"),
    "Flight Total": ("Uçuş cəmi", "Итого по рейсу"),
    "Flight from Baku": ("Bakıdan uçuş", "Рейс из Баку"),
    "Form": ("Forma", "Форма"),
    "Free changes anytime": ("İstənilən vaxt pulsuz dəyişiklik", "Бесплатные изменения в любое время"),
    "Fri": ("Cüm", "Пт"),
    "From Baku to the world beyond — start a journey shaped with calm precision.": (
        "Bakıdan dünyaya — sakit dəqiqliklə formalaşmış səyahətə başlayın.",
        "Из Баку в большой мир — начните путь, созданный со спокойной точностью.",
    ),
    "From Caspian shores to distant capitals, discover journeys shaped with calm precision.": (
        "Xəzər sahillərindən uzaq paytaxtlara — sakit dəqiqliklə formalaşmış səyahətləri kəşf edin.",
        "От берегов Каспия до дальних столиц — путешествия со спокойной точностью.",
    ),
    "Fully refundable": ("Tam geri qaytarılan", "Полный возврат"),
    "Galley": ("Mətbəx", "Камбуз"),
    "Get assistance whenever you need it, before or during your journey.": (
        "Səyahətdən əvvəl və ya zamanı lazım olanda dəstək alın.",
        "Получайте помощь до и во время путешествия.",
    ),
    "Grand Total": ("Ümumi cəm", "Итого"),
    "Halal Meal": ("Halal yemək", "Халяльное питание"),
    "Keep this reference for managing your trip.": (
        "Səyahəti idarə etmək üçün bu istinadı saxlayın.",
        "Сохраните этот код для управления поездкой.",
    ),
    "Keep your details and travel preferences up to date for faster bookings.": (
        "Daha sürətli bron üçün məlumat və üstünlüklərinizi yeniləyin.",
        "Обновляйте данные и предпочтения для более быстрых бронирований.",
    ),
    "Kids Meal": ("Uşaq yeməyi", "Детское питание"),
    "Lie-flat seat selection": ("Tam uzanan oturacaq seçimi", "Выбор кресла-кровати"),
    "Life Above the Clouds": ("Buludların üzərindəki həyat", "Жизнь над облаками"),
    "Light meal and soft drinks": ("Yüngül yemək və sərinləşdirici içkilər", "Лёгкое питание и напитки"),
    "Listening…": ("Dinlənilir…", "Слушаю…"),
    "Luxury Without Noise": ("Səs-küy olmadan lüks", "Роскошь без шума"),
    "Main Airport": ("Əsas hava limanı", "Главный аэропорт"),
    "Manage Your Trips": ("Səyahətlərinizi idarə edin", "Управляйте поездками"),
    "Manage reservations, preferences, and extras with tools built around real travel needs.": (
        "Real səyahət ehtiyaclarına uyğun alətlərlə bron, üstünlük və əlavələri idarə edin.",
        "Управляйте бронями, предпочтениями и опциями инструментами под реальные нужды.",
    ),
    "Mark All as Read": ("Hamısını oxunmuş işarələ", "Отметить всё прочитанным"),
    "Meal": ("Yemək", "Питание"),
    "Meal Summary": ("Yemək xülasəsi", "Сводка питания"),
    "Meal Total": ("Yemək cəmi", "Итого питание"),
    "Mon": ("B.e.", "Пн"),
    "Month": ("Ay", "Месяц"),
    "Mr": ("Cənab", "Г-н"),
    "Mrs": ("Xanım", "Г-жа"),
    "Ms": ("Xanım", "Г-жа"),
    "Mx": ("Mx", "Mx"),
    "New Selection": ("Yeni seçim", "Новый выбор"),
    "No Extra Baggage": ("Əlavə baqaj yoxdur", "Без доп. багажа"),
    "No past trips": ("Keçmiş səyahət yoxdur", "Нет прошлых поездок"),
    "No upcoming trips": ("Gələcək səyahət yoxdur", "Нет предстоящих поездок"),
    "Passenger & Seat": ("Sərnişin və oturacaq", "Пассажир и место"),
    "Passenger 1": ("Sərnişin 1", "Пассажир 1"),
    "Passenger Information": ("Sərnişin məlumatı", "Данные пассажира"),
    "Passenger Name": ("Sərnişin adı", "Имя пассажира"),
    "Pay quickly with Apple Pay": ("Apple Pay ilə tez ödəyin", "Быстрая оплата через Apple Pay"),
    "Pay quickly with Google Pay": ("Google Pay ilə tez ödəyin", "Быстрая оплата через Google Pay"),
    "Payment Method": ("Ödəniş üsulu", "Способ оплаты"),
    "Preferred Cabin Class": ("Üstünlük verilən salon", "Предпочтительный класс"),
    "Preferred Meal": ("Üstünlük verilən yemək", "Предпочтительное питание"),
    "Preferred seat selection": ("Üstünlük verilən oturacaq seçimi", "Выбор предпочтительного места"),
    "Premium Travel Experience": ("Premium səyahət təcrübəsi", "Премиальный опыт путешествий"),
    "Price Breakdown": ("Qiymət bölgüsü", "Разбивка цены"),
    "Price Calendar": ("Qiymət təqvimi", "Календарь цен"),
    "Price Difference": ("Qiymət fərqi", "Разница в цене"),
    "Price Summary": ("Qiymət xülasəsi", "Сводка цены"),
    "Print Confirmation": ("Təsdiqi çap et", "Распечатать подтверждение"),
    "Ready to Choose Your Horizon?": ("Üfüqünüzü seçməyə hazırsınız?", "Готовы выбрать свой горизонт?"),
    "Ready to Fly": ("Uçmağa hazırsınız", "Готовы лететь"),
    "Realistic milestones that reflect our growing network and the travelers who fly with us.": (
        "Böyüyən şəbəkəmizi və bizimlə uçan sərnişinləri əks etdirən real göstəricilər.",
        "Реалистичные ориентиры нашей растущей сети и путешественников с нами.",
    ),
    "Recommended balance of space, service, and flexibility": (
        "Məkan, xidmət və çevikliyin tövsiyə olunan balansı",
        "Рекомендуемый баланс пространства, сервиса и гибкости",
    ),
    "Reduced cancellation fee": ("Azaldılmış ləğvetmə haqqı", "Сниженный сбор за отмену"),
    "Refined travel without compromise": ("Kompromissiz zərif səyahət", "Изысканные путешествия без компромиссов"),
    "Registration Number": ("Qeydiyyat nömrəsi", "Регистрационный номер"),
    "Relationship": ("Əlaqə", "Отношение"),
    "Retrieve your reservation with your booking reference and last name.": (
        "Bron istinadı və soyadınızla rezervasiyanızı tapın.",
        "Найдите бронь по коду и фамилии.",
    ),
    "Review the full itinerary, ancillaries, and fare breakdown for this reservation.": (
        "Bu rezervasiya üçün tam marşrut, əlavələr və tarif bölgüsünü nəzərdən keçirin.",
        "Просмотрите полный маршрут, опции и разбивку тарифа.",
    ),
    "Review your itinerary and choose the cabin that best suits your journey.": (
        "Marşrutunuzu nəzərdən keçirin və səyahətə ən uyğun salonu seçin.",
        "Просмотрите маршрут и выберите подходящий салон.",
    ),
    "Sat": ("Şən", "Сб"),
    "Save Passenger": ("Sərnişini yadda saxla", "Сохранить пассажира"),
    "Saved Passenger Profiles": ("Yadda saxlanılmış sərnişinlər", "Сохранённые пассажиры"),
    "Search Booking": ("Bron axtar", "Найти бронь"),
    "Seat": ("Oturacaq", "Место"),
    "Seat Map": ("Oturacaq xəritəsi", "Карта мест"),
    "Seat selection": ("Oturacaq seçimi", "Выбор места"),
    "Seat(s)": ("Oturacaq(lar)", "Место(а)"),
    "Select a date to update your departure date.": (
        "Gediş tarixini yeniləmək üçün tarix seçin.",
        "Выберите дату, чтобы обновить вылет.",
    ),
    "Select code": ("Kod seçin", "Выберите код"),
    "Select title": ("Ünvan seçin", "Выберите обращение"),
    "Select your destination and begin a journey designed with composure and care.": (
        "İstiqamətinizi seçin və sakitliklə hazırlanmış səyahətə başlayın.",
        "Выберите направление и начните путь, созданный со спокойствием и заботой.",
    ),
    "Smart Seat Selection": ("Ağıllı oturacaq seçimi", "Умный выбор мест"),
    "Standard Meal": ("Standart yemək", "Стандартное питание"),
    "Standard seat selection": ("Standart oturacaq seçimi", "Стандартный выбор места"),
    "Starting Fare": ("Başlanğıc tarif", "Стартовый тариф"),
    "Stay updated on bookings, flights, payments, and AEROVA offers.": (
        "Bronlar, uçuşlar, ödənişlər və AEROVA təklifləri barədə xəbərdar olun.",
        "Будьте в курсе броней, рейсов, оплат и предложений AEROVA.",
    ),
    "Subscribe": ("Abunə ol", "Подписаться"),
    "Sun": ("Baz", "Вс"),
    "Taxes & Fees": ("Vergilər və rüsumlar", "Налоги и сборы"),
    "Taxes / Fees": ("Vergilər / Rüsumlar", "Налоги / Сборы"),
    "Thoughtful cabins, considered dining, and service that stays quietly ahead of every moment aloft.": (
        "Düşünülmüş salonlar, diqqətli yeməklər və uçuşun hər anında sakitcə irəlidə olan xidmət.",
        "Продуманные салоны, внимательная кухня и сервис, который тихо опережает каждый момент в воздухе.",
    ),
    "Thu": ("C.a.", "Чт"),
    "Times": ("Vaxtlar", "Время"),
    "To deliver safe, seamless, and beautifully composed travel — from the first search to the final arrival gate.": (
        "İlk axtarışdan son gəliş qapısına qədər təhlükəsiz, rəvan və gözəl tərtib olunmuş səyahət təqdim etmək.",
        "Дарить безопасные, бесшовные и красиво выстроенные путешествия — от первого поиска до финального выхода.",
    ),
    "Total Baggage Cost": ("Ümumi baqaj dəyəri", "Общая стоимость багажа"),
    "Total Meal Cost": ("Ümumi yemək dəyəri", "Общая стоимость питания"),
    "Total Price": ("Ümumi qiymət", "Общая цена"),
    "Total Seats": ("Ümumi oturacaqlar", "Всего мест"),
    "Total Trips": ("Ümumi səyahətlər", "Всего поездок"),
    "Travel Better With AEROVA": ("AEROVA ilə daha yaxşı səyahət edin", "Путешествуйте лучше с AEROVA"),
    "Travel With Intention": ("Məqsədlə səyahət edin", "Путешествуйте осознанно"),
    "Trip Summary": ("Səyahət xülasəsi", "Сводка поездки"),
    "Tue": ("Ç.a.", "Вт"),
    "Update your flight date, cabin class, or seats. Your current booking details stay visible below.": (
        "Uçuş tarixi, salon və ya oturacaqları yeniləyin. Cari bron detalları aşağıda qalır.",
        "Обновите дату, класс или места. Текущие детали брони видны ниже.",
    ),
    "Vegan Meal": ("Vegan yemək", "Веганское питание"),
    "Vegetarian Meal": ("Vegeterian yemək", "Вегетарианское питание"),
    "View Destinations": ("İstiqamətlərə bax", "Смотреть направления"),
    "View My Trips": ("Səyahətlərimə bax", "Мои поездки"),
    "View and manage your AEROVA reservations in one place.": (
        "AEROVA rezervasiyalarınızı bir yerdə görün və idarə edin.",
        "Просматривайте и управляйте бронями AEROVA в одном месте.",
    ),
    "View, manage and track all your upcoming journeys.": (
        "Bütün gələcək səyahətlərinizi görün, idarə edin və izləyin.",
        "Просматривайте, управляйте и отслеживайте предстоящие поездки.",
    ),
    "Visa, Mastercard, and other major cards": ("Visa, Mastercard və digər əsas kartlar", "Visa, Mastercard и другие карты"),
    "We could not find that destination. Explore our collection and choose your next horizon.": (
        "Bu istiqamət tapılmadı. Kolleksiyamızı kəşf edin və növbəti üfüqünüzü seçin.",
        "Направление не найдено. Изучите коллекцию и выберите следующий горизонт.",
    ),
    "We'll use these details to send your booking confirmation.": (
        "Bu məlumatlarla bron təsdiqinizi göndərəcəyik.",
        "Мы используем эти данные для отправки подтверждения.",
    ),
    "Wed": ("Çər", "Ср"),
    "When you book a flight with AEROVA, your upcoming reservations will appear here.": (
        "AEROVA ilə uçuş bron etdikdə gələcək rezervasiyalarınız burada görünəcək.",
        "Когда вы бронируете рейс AEROVA, предстоящие брони появятся здесь.",
    ),
    "Where Will You Fly Next?": ("Növbəti haraya uçacaqsınız?", "Куда полетите дальше?"),
    "Why Choose AEROVA": ("Niyə AEROVA", "Почему AEROVA"),
    "Your Next Chapter Begins Onboard": ("Növbəti fəsiliniz göyərtədə başlayır", "Ваша следующая глава начинается на борту"),
    "Your payment information is securely processed.": (
        "Ödəniş məlumatlarınız təhlükəsiz emal olunur.",
        "Платёжные данные обрабатываются безопасно.",
    ),
    "Your reservation has been successfully created.": (
        "Rezervasiyanız uğurla yaradıldı.",
        "Ваше бронирование успешно создано.",
    ),
    "← All Destinations": ("← Bütün istiqamətlər", "← Все направления"),
}


def load_locale(lang):
    text = (LOC / f"{lang}.js").read_text(encoding="utf-8")
    m = re.search(r"window\.AEROVA_LOCALES\.\w+\s*=\s*(\{[\s\S]*\});\s*$", text)
    ns = {}
    exec("d = " + m.group(1), ns)
    return ns["d"]


def dump_locale(lang, obj):
    body = json.dumps(obj, ensure_ascii=False, indent=2)
    (LOC / f"{lang}.js").write_text(
        f"window.AEROVA_LOCALES = window.AEROVA_LOCALES || {{}};\nwindow.AEROVA_LOCALES.{lang} = {body};\n",
        encoding="utf-8",
    )


def slug(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", " ", s).strip().lower()
    parts = s.split()[:6]
    return "".join(w.capitalize() if i else w for i, w in enumerate(parts)) or "text"


def main():
    en = load_locale("en")
    az = load_locale("az")
    ru = load_locale("ru")
    ui = en.setdefault("ui", {})
    uiaz = az.setdefault("ui", {})
    uiru = ru.setdefault("ui", {})

    used = set(ui.keys())
    for en_text, (az_text, ru_text) in PAIRS.items():
        base = slug(en_text)
        key = base
        i = 2
        while key in used:
            key = f"{base}{i}"
            i += 1
        used.add(key)
        ui[key] = en_text
        uiaz[key] = az_text
        uiru[key] = ru_text

    dump_locale("en", en)
    dump_locale("az", az)
    dump_locale("ru", ru)
    print("added", len(PAIRS), "ui keys")
    subprocess.check_call(["python", str(ROOT / "tools" / "retag_html_i18n.py")])


if __name__ == "__main__":
    main()
