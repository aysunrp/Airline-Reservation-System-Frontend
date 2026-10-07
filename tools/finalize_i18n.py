# -*- coding: utf-8 -*-
"""Finalize AEROVA i18n: expand dicts, auto-tag HTML, fix storage key."""
from __future__ import annotations

import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOC = ROOT / "assets" / "js" / "locales"
JS = ROOT / "assets" / "js"

EXTRA_EN = {
    "common": {
        "origin": "Origin",
        "destination": "Destination",
        "searchFlights": "Search Flights",
        "modifySearch": "Modify search",
        "viewDetails": "View Details",
        "selectFlight": "Select Flight",
        "bookFlight": "Book a Flight",
        "startJourney": "Start Your Journey",
        "included": "Included",
        "occupied": "Occupied",
        "reserved": "Reserved",
        "blocked": "Blocked",
        "onTime": "On Time",
        "delayed": "Delayed",
        "cancelled": "Cancelled",
        "confirmed": "Confirmed",
        "completed": "Completed",
        "unread": "Unread",
        "read": "Read",
        "print": "Print",
        "download": "Download",
        "forgotPassword": "Forgot Password",
        "personalInfo": "Personal Information",
        "contactInfo": "Contact Information",
        "travelPreferences": "Travel Preferences",
        "upcomingTrips": "Upcoming Trips",
        "pastTrips": "Past Trips",
        "selectedFlight": "Selected Flight",
        "noExtra": "No Extra",
        "plus10kg": "+10 kg",
        "plus20kg": "+20 kg",
        "plus30kg": "+30 kg",
        "noMeal": "No Meal",
        "standard": "Standard",
        "extraLegroom": "Extra Legroom",
        "fastTrack": "Fast Track",
        "priorityBoarding": "Priority Boarding",
        "loungeAccess": "Lounge Access",
        "travelInsurance": "Travel Insurance",
        "twoPlusStops": "2+ Stops",
        "applePay": "Apple Pay",
        "googlePay": "Google Pay",
        "cardPay": "Credit / Debit Card",
        "months": {
            "1": "January", "2": "February", "3": "March", "4": "April",
            "5": "May", "6": "June", "7": "July", "8": "August",
            "9": "September", "10": "October", "11": "November", "12": "December"
        },
    },
    "home": {
        "searchButton": "Search Flights",
        "voiceStart": "Start voice search",
        "voiceStop": "Stop voice search",
        "voiceUnsupported": "Voice search is not supported in this browser. Please type your request.",
        "voiceCaptureFail": "Unable to capture voice input. Please try again or type your request.",
        "voiceStartFail": "Unable to start voice search. Please try again or type your request.",
        "voiceEmpty": "Please say or type where you would like to fly.",
        "voiceNeedFrom": "Please provide your origin.",
        "voiceNeedTo": "Please provide your destination.",
        "craftedTitle": "Crafted for Modern Travel",
        "missionTitle": "Our Mission",
        "missionHeading": "Elevate Every Flight",
        "visionTitle": "Our Vision",
        "visionHeading": "Set the Standard for Calm Luxury",
        "numbersTitle": "AEROVA by the Numbers",
        "whyEasyTitle": "Effortless Booking",
        "newsletterEmailRequired": "Please enter your email address.",
    },
    "seats": {
        "titleSingle": "Select Your Seat",
        "selectedSeat": "Selected Seat",
        "selectedSeats": "Selected Seats",
        "businessClass": "Business Class",
        "dateNotSelected": "Date not selected",
        "seatOccupiedAria": "Seat {id} occupied",
        "seatAria": "Seat {id}",
        "maxSeats": "You can select up to {count} seats.",
        "selectOneMore": "Please select 1 more seat.",
        "selectMore": "Please select {count} more seats.",
        "selectN": "Please select {count} seats to continue.",
        "ofSelected": "{selected} of {total} seats selected",
        "legendOccupied": "Occupied",
        "priceIncluded": "Included",
    },
    "payment": {
        "bookingNotFound": "Booking not found",
        "enterPromo": "Enter a promo code",
        "promoAlready": "Promo code already applied",
        "removeCodeFirst": "Remove the current code first",
        "promoSaveFail": "Unable to save promo code",
        "fieldRequired": "This field is required",
        "cardholder": "Enter cardholder name",
        "enterCard": "Enter card number",
        "validCard": "Enter a valid card number",
        "enterExpiry": "Enter expiry date",
        "validExpiry": "Enter a valid expiry date",
        "enterCvv": "Enter CVV",
        "validCvv": "Enter a valid CVV",
        "applePayLabel": "Apple Pay",
        "googlePayLabel": "Google Pay",
        "cardLabel": "Credit / Debit Card",
    },
    "notifications": {
        "noNotifications": "No Notifications",
        "cancelledTitle": "Booking Cancelled",
        "cancelledBody": "Reservation {pnr} for {route} has been cancelled.",
        "confirmedTitle": "Booking Confirmed",
        "confirmedBody": "Your AEROVA reservation {pnr} for {route} is confirmed.",
        "paymentTitle": "Payment Successful",
        "paymentBody": "Payment of {amount} was received successfully for booking {pnr}.",
        "flightUpdateTitle": "Flight Update",
        "flightUpdateBody": "Your flight details were updated. Cabin: {cabin}.",
        "checkinTitle": "Check-in Reminder",
        "checkinBody": "Online check-in opens 24 hours before departure for flight {flight}.",
        "markedRead": "Notification marked as read.",
        "noneToUpdate": "There are no notifications to update.",
        "allAlreadyRead": "All notifications are already read.",
        "allMarkedRead": "All notifications marked as read.",
        "noneToClear": "There are no notifications to clear.",
        "allCleared": "All notifications have been cleared.",
    },
    "auth": {
        "registerEyebrow": "Join AEROVA",
        "registerTitle": "Create your account",
        "registerSubtitle": "Register to manage bookings and personalized travel details.",
        "firstNamePh": "First name",
        "lastNamePh": "Last name",
        "passwordPhLong": "At least 6 characters",
        "confirmPh": "Repeat password",
        "hasAccount": "Already have an account?",
        "createAccount": "Create Account",
    },
    "baggage": {
        "subtitle": "Add extra checked baggage for each passenger on your journey.",
        "noExtra": "No Extra",
        "kg10": "+10 kg",
        "kg20": "+20 kg",
        "kg30": "+30 kg",
    },
    "meals": {
        "noMeal": "No Meal",
        "standard": "Standard",
    },
    "extras": {
        "priorityBoarding": "Priority Boarding",
        "loungeAccess": "Lounge Access",
        "extraLegroom": "Extra Legroom",
        "fastTrack": "Fast Track",
        "travelInsurance": "Travel Insurance",
    },
    "admin": {
        "add": "Add",
        "edit": "Edit",
        "delete": "Delete",
        "view": "View",
        "save": "Save",
        "search": "Search",
        "filter": "Filter",
        "available": "Available",
        "occupied": "Occupied",
        "reserved": "Reserved",
        "blocked": "Blocked",
        "onTime": "On Time",
        "delayed": "Delayed",
        "cancelled": "Cancelled",
        "confirmed": "Confirmed",
        "totalFlights": "Total Flights",
        "activeRoutes": "Active Routes",
        "availableSeats": "Available Seats",
        "recentBookings": "Recent Bookings",
        "upcomingFlights": "Upcoming Flights",
        "passenger": "Passenger",
        "operationsOverview": "Airline operations overview",
    },
    "about": {
        "startJourney": "Start Your Journey",
        "crafted": "Crafted for Modern Travel",
        "missionLabel": "Our Mission",
        "missionHeading": "Elevate Every Flight",
        "visionLabel": "Our Vision",
        "visionHeading": "Set the Standard for Calm Luxury",
        "numbers": "AEROVA by the Numbers",
    },
    "trips": {
        "upcomingTrips": "Upcoming Trips",
        "pastTrips": "Past Trips",
        "viewDetails": "View Details",
        "changeBooking": "Change Booking",
        "cancelBooking": "Cancel Booking",
        "download": "Download",
        "print": "Print",
    },
    "results": {
        "pageAria": "Available flight results",
    },
}

EXTRA_AZ = {
    "common": {
        "origin": "Mənşə", "destination": "Təyinat", "searchFlights": "Uçuş axtar",
        "modifySearch": "Axtarışı dəyiş", "viewDetails": "Ətraflı bax", "selectFlight": "Uçuşu seç",
        "bookFlight": "Uçuş bron et", "startJourney": "Səyahətə başla", "included": "Daxildir",
        "occupied": "Məşğul", "reserved": "Rezerv", "blocked": "Bloklanıb",
        "onTime": "Vaxtında", "delayed": "Gecikir", "cancelled": "Ləğv edilib",
        "confirmed": "Təsdiqlənib", "completed": "Tamamlanıb", "unread": "Oxunmayıb",
        "read": "Oxunub", "print": "Çap et", "download": "Yüklə",
        "forgotPassword": "Şifrəni unutdum", "personalInfo": "Şəxsi məlumat",
        "contactInfo": "Əlaqə məlumatı", "travelPreferences": "Səyahət üstünlükləri",
        "upcomingTrips": "Gələcək səyahətlər", "pastTrips": "Keçmiş səyahətlər",
        "selectedFlight": "Seçilmiş uçuş", "noExtra": "Əlavə yoxdur",
        "plus10kg": "+10 kq", "plus20kg": "+20 kq", "plus30kg": "+30 kq",
        "noMeal": "Yemək yoxdur", "standard": "Standart", "extraLegroom": "Əlavə ayaq yeri",
        "fastTrack": "Fast Track", "priorityBoarding": "Prioritet miniş",
        "loungeAccess": "Zal girişi", "travelInsurance": "Səyahət sığortası",
        "twoPlusStops": "2+ dayanacaq", "applePay": "Apple Pay", "googlePay": "Google Pay",
        "cardPay": "Kredit / Debet kartı",
        "status": "Status",
        "months": {
            "1": "Yanvar", "2": "Fevral", "3": "Mart", "4": "Aprel", "5": "May", "6": "İyun",
            "7": "İyul", "8": "Avqust", "9": "Sentyabr", "10": "Oktyabr", "11": "Noyabr", "12": "Dekabr"
        },
    },
    "home": {
        "searchButton": "Uçuş axtar", "voiceStart": "Səsli axtarışı başlat", "voiceStop": "Səsli axtarışı dayandır",
        "voiceUnsupported": "Bu brauzerdə səsli axtarış dəstəklənmir. Zəhmət olmasa yazın.",
        "voiceCaptureFail": "Səs daxil edilə bilmədi. Yenidən cəhd edin və ya yazın.",
        "voiceStartFail": "Səsli axtarış başladıla bilmədi. Yenidən cəhd edin və ya yazın.",
        "voiceEmpty": "Haraya uçmaq istədiyinizi deyin və ya yazın.",
        "voiceNeedFrom": "Gediş nöqtəsini göstərin.", "voiceNeedTo": "Təyinatı göstərin.",
        "craftedTitle": "Müasir səyahət üçün yaradılıb", "missionTitle": "Missiyamız",
        "missionHeading": "Hər uçuşu yüksəldin", "visionTitle": "Vizyonumuz",
        "visionHeading": "Sakit lüks üçün standart təyin edin", "numbersTitle": "Rəqəmlərlə AEROVA",
        "whyEasyTitle": "Asan bron", "newsletterEmailRequired": "E-poçt ünvanınızı daxil edin.",
    },
    "seats": {
        "titleSingle": "Oturacağınızı seçin", "selectedSeat": "Seçilmiş oturacaq",
        "selectedSeats": "Seçilmiş oturacaqlar", "businessClass": "Biznes sinif",
        "dateNotSelected": "Tarix seçilməyib", "seatOccupiedAria": "Oturacaq {id} məşğuldur",
        "seatAria": "Oturacaq {id}", "maxSeats": "Ən çox {count} oturacaq seçə bilərsiniz.",
        "selectOneMore": "Daha 1 oturacaq seçin.", "selectMore": "Daha {count} oturacaq seçin.",
        "selectN": "Davam etmək üçün {count} oturacaq seçin.",
        "ofSelected": "{total} yerdən {selected} oturacaq seçildi",
        "legendOccupied": "Məşğul", "priceIncluded": "Daxildir",
    },
    "payment": {
        "bookingNotFound": "Bron tapılmadı", "enterPromo": "Promo kod daxil edin",
        "promoAlready": "Promo kod artıq tətbiq olunub", "removeCodeFirst": "Əvvəlcə cari kodu silin",
        "promoSaveFail": "Promo kod yadda saxlanılmadı", "fieldRequired": "Bu sahə mütləqdir",
        "cardholder": "Kart sahibinin adını daxil edin", "enterCard": "Kart nömrəsini daxil edin",
        "validCard": "Düzgün kart nömrəsi daxil edin", "enterExpiry": "Bitmə tarixini daxil edin",
        "validExpiry": "Düzgün bitmə tarixi daxil edin", "enterCvv": "CVV daxil edin",
        "validCvv": "Düzgün CVV daxil edin", "applePayLabel": "Apple Pay",
        "googlePayLabel": "Google Pay", "cardLabel": "Kredit / Debet kartı",
    },
    "notifications": {
        "noNotifications": "Bildiriş yoxdur", "cancelledTitle": "Bron ləğv edildi",
        "cancelledBody": "{route} üçün {pnr} rezervasiyası ləğv edildi.",
        "confirmedTitle": "Bron təsdiqləndi",
        "confirmedBody": "{route} üçün AEROVA rezervasiyanız {pnr} təsdiqləndi.",
        "paymentTitle": "Ödəniş uğurlu oldu",
        "paymentBody": "{pnr} bronu üçün {amount} ödənişi uğurla alındı.",
        "flightUpdateTitle": "Uçuş yeniləməsi",
        "flightUpdateBody": "Uçuş məlumatlarınız yeniləndi. Salon: {cabin}.",
        "checkinTitle": "Check-in xatırlatması",
        "checkinBody": "{flight} uçuşu üçün onlayn check-in gedişdən 24 saat əvvəl açılır.",
        "markedRead": "Bildiriş oxunmuş kimi işarələndi.",
        "noneToUpdate": "Yenilənəcək bildiriş yoxdur.",
        "allAlreadyRead": "Bütün bildirişlər artıq oxunub.",
        "allMarkedRead": "Bütün bildirişlər oxunmuş kimi işarələndi.",
        "noneToClear": "Təmizlənəcək bildiriş yoxdur.",
        "allCleared": "Bütün bildirişlər təmizləndi.",
    },
    "auth": {
        "registerEyebrow": "AEROVA-ya qoşulun", "registerTitle": "Hesab yaradın",
        "registerSubtitle": "Bronları və fərdiləşdirilmiş səyahət məlumatlarını idarə etmək üçün qeydiyyatdan keçin.",
        "firstNamePh": "Ad", "lastNamePh": "Soyad", "passwordPhLong": "Ən azı 6 simvol",
        "confirmPh": "Şifrəni təkrarlayın", "hasAccount": "Artıq hesabınız var?",
        "createAccount": "Hesab yarat",
    },
    "baggage": {
        "subtitle": "Səyahətinizdə hər sərnişin üçün əlavə yoxlanılan baqaj əlavə edin.",
        "noExtra": "Əlavə yoxdur", "kg10": "+10 kq", "kg20": "+20 kq", "kg30": "+30 kq",
    },
    "meals": {"noMeal": "Yemək yoxdur", "standard": "Standart", "vegetarian": "Vegetarian", "vegan": "Vegan", "halal": "Halal"},
    "extras": {
        "priorityBoarding": "Prioritet miniş", "loungeAccess": "Zal girişi",
        "extraLegroom": "Əlavə ayaq yeri", "fastTrack": "Fast Track", "travelInsurance": "Səyahət sığortası",
    },
    "admin": {
        "add": "Əlavə et", "edit": "Redaktə", "delete": "Sil", "view": "Bax", "save": "Yadda saxla",
        "search": "Axtar", "filter": "Filter", "available": "Mövcud", "occupied": "Məşğul",
        "reserved": "Rezerv", "blocked": "Bloklanıb", "onTime": "Vaxtında", "delayed": "Gecikir",
        "cancelled": "Ləğv edilib", "confirmed": "Təsdiqlənib", "totalFlights": "Ümumi uçuşlar",
        "activeRoutes": "Aktiv marşrutlar", "availableSeats": "Mövcud oturacaqlar",
        "recentBookings": "Son bronlar", "upcomingFlights": "Yaxınlaşan uçuşlar",
        "passenger": "Sərnişin", "operationsOverview": "Aviaşirkət əməliyyatlarına baxış",
        "brandSub": "Admin", "status": "Status", "pnr": "PNR",
    },
    "about": {
        "startJourney": "Səyahətə başla", "crafted": "Müasir səyahət üçün yaradılıb",
        "missionLabel": "Missiyamız", "missionHeading": "Hər uçuşu yüksəldin",
        "visionLabel": "Vizyonumuz", "visionHeading": "Sakit lüks üçün standart təyin edin",
        "numbers": "Rəqəmlərlə AEROVA",
    },
    "trips": {
        "upcomingTrips": "Gələcək səyahətlər", "pastTrips": "Keçmiş səyahətlər",
        "viewDetails": "Ətraflı bax", "changeBooking": "Bronu dəyiş", "cancelBooking": "Bronu ləğv et",
        "download": "Yüklə", "print": "Çap et",
    },
    "results": {"pageAria": "Mövcud uçuş nəticələri"},
    "payment": {"cvv": "CVV"},
}

# Fix nested common in EXTRA_AZ - I duplicated common key. Merge properly below.

EXTRA_RU = {
    "common": {
        "origin": "Откуда", "destination": "Куда", "searchFlights": "Найти рейсы",
        "modifySearch": "Изменить поиск", "viewDetails": "Подробнее", "selectFlight": "Выбрать рейс",
        "bookFlight": "Забронировать рейс", "startJourney": "Начать путешествие", "included": "Включено",
        "occupied": "Занято", "reserved": "Зарезервировано", "blocked": "Заблокировано",
        "onTime": "Вовремя", "delayed": "Задержка", "cancelled": "Отменено",
        "confirmed": "Подтверждено", "completed": "Завершено", "unread": "Непрочитано",
        "read": "Прочитано", "print": "Печать", "download": "Скачать",
        "forgotPassword": "Забыли пароль", "personalInfo": "Личная информация",
        "contactInfo": "Контактная информация", "travelPreferences": "Предпочтения в поездках",
        "upcomingTrips": "Предстоящие поездки", "pastTrips": "Прошедшие поездки",
        "selectedFlight": "Выбранный рейс", "noExtra": "Без доплаты",
        "plus10kg": "+10 кг", "plus20kg": "+20 кг", "plus30kg": "+30 кг",
        "noMeal": "Без питания", "standard": "Стандарт", "extraLegroom": "Доп. место для ног",
        "fastTrack": "Fast Track", "priorityBoarding": "Приоритетная посадка",
        "loungeAccess": "Доступ в зал", "travelInsurance": "Страхование",
        "twoPlusStops": "2+ пересадки", "applePay": "Apple Pay", "googlePay": "Google Pay",
        "cardPay": "Кредитная / дебетовая карта",
        "months": {
            "1": "Январь", "2": "Февраль", "3": "Март", "4": "Апрель", "5": "Май", "6": "Июнь",
            "7": "Июль", "8": "Август", "9": "Сентябрь", "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь"
        },
        "status": "Статус",
    },
    "home": {
        "searchButton": "Найти рейсы", "voiceStart": "Начать голосовой поиск", "voiceStop": "Остановить голосовой поиск",
        "voiceUnsupported": "Голосовой поиск не поддерживается в этом браузере. Введите запрос текстом.",
        "voiceCaptureFail": "Не удалось распознать голос. Попробуйте снова или введите текстом.",
        "voiceStartFail": "Не удалось начать голосовой поиск. Попробуйте снова или введите текстом.",
        "voiceEmpty": "Скажите или напишите, куда вы хотите полететь.",
        "voiceNeedFrom": "Укажите пункт вылета.", "voiceNeedTo": "Укажите пункт назначения.",
        "craftedTitle": "Создано для современных путешествий", "missionTitle": "Наша миссия",
        "missionHeading": "Возвышать каждый полёт", "visionTitle": "Наше видение",
        "visionHeading": "Задать стандарт спокойной роскоши", "numbersTitle": "AEROVA в цифрах",
        "whyEasyTitle": "Простое бронирование", "newsletterEmailRequired": "Введите адрес эл. почты.",
    },
    "seats": {
        "titleSingle": "Выберите место", "selectedSeat": "Выбранное место",
        "selectedSeats": "Выбранные места", "businessClass": "Бизнес класс",
        "dateNotSelected": "Дата не выбрана", "seatOccupiedAria": "Место {id} занято",
        "seatAria": "Место {id}", "maxSeats": "Можно выбрать до {count} мест.",
        "selectOneMore": "Выберите ещё 1 место.", "selectMore": "Выберите ещё {count} мест.",
        "selectN": "Выберите {count} мест, чтобы продолжить.",
        "ofSelected": "Выбрано {selected} из {total} мест",
        "legendOccupied": "Занято", "priceIncluded": "Включено",
    },
    "payment": {
        "bookingNotFound": "Бронирование не найдено", "enterPromo": "Введите промокод",
        "promoAlready": "Промокод уже применён", "removeCodeFirst": "Сначала удалите текущий код",
        "promoSaveFail": "Не удалось сохранить промокод", "fieldRequired": "Обязательное поле",
        "cardholder": "Введите имя владельца карты", "enterCard": "Введите номер карты",
        "validCard": "Введите корректный номер карты", "enterExpiry": "Введите срок действия",
        "validExpiry": "Введите корректный срок", "enterCvv": "Введите CVV",
        "validCvv": "Введите корректный CVV", "applePayLabel": "Apple Pay",
        "googlePayLabel": "Google Pay", "cardLabel": "Кредитная / дебетовая карта",
        "cvv": "CVV",
    },
    "notifications": {
        "noNotifications": "Нет уведомлений", "cancelledTitle": "Бронирование отменено",
        "cancelledBody": "Бронирование {pnr} по маршруту {route} отменено.",
        "confirmedTitle": "Бронирование подтверждено",
        "confirmedBody": "Ваше бронирование AEROVA {pnr} по маршруту {route} подтверждено.",
        "paymentTitle": "Оплата прошла успешно",
        "paymentBody": "Оплата {amount} за бронирование {pnr} получена успешно.",
        "flightUpdateTitle": "Обновление рейса",
        "flightUpdateBody": "Детали вашего рейса обновлены. Класс: {cabin}.",
        "checkinTitle": "Напоминание о регистрации",
        "checkinBody": "Онлайн-регистрация открывается за 24 часа до вылета рейса {flight}.",
        "markedRead": "Уведомление отмечено как прочитанное.",
        "noneToUpdate": "Нет уведомлений для обновления.",
        "allAlreadyRead": "Все уведомления уже прочитаны.",
        "allMarkedRead": "Все уведомления отмечены как прочитанные.",
        "noneToClear": "Нет уведомлений для очистки.",
        "allCleared": "Все уведомления очищены.",
    },
    "auth": {
        "registerEyebrow": "Присоединяйтесь к AEROVA", "registerTitle": "Создайте аккаунт",
        "registerSubtitle": "Зарегистрируйтесь, чтобы управлять бронированиями и персональными данными.",
        "firstNamePh": "Имя", "lastNamePh": "Фамилия", "passwordPhLong": "Не менее 6 символов",
        "confirmPh": "Повторите пароль", "hasAccount": "Уже есть аккаунт?",
        "createAccount": "Создать аккаунт", "emailPlaceholder": "you@email.com",
    },
    "baggage": {
        "subtitle": "Добавьте дополнительный регистрируемый багаж для каждого пассажира.",
        "noExtra": "Без доплаты", "kg10": "+10 кг", "kg20": "+20 кг", "kg30": "+30 кг",
    },
    "meals": {"noMeal": "Без питания", "standard": "Стандарт"},
    "extras": {
        "priorityBoarding": "Приоритетная посадка", "loungeAccess": "Доступ в зал",
        "extraLegroom": "Доп. место для ног", "fastTrack": "Fast Track", "travelInsurance": "Страхование",
    },
    "admin": {
        "add": "Добавить", "edit": "Изменить", "delete": "Удалить", "view": "Смотреть", "save": "Сохранить",
        "search": "Поиск", "filter": "Фильтр", "available": "Доступно", "occupied": "Занято",
        "reserved": "Зарезервировано", "blocked": "Заблокировано", "onTime": "Вовремя", "delayed": "Задержка",
        "cancelled": "Отменено", "confirmed": "Подтверждено", "totalFlights": "Всего рейсов",
        "activeRoutes": "Активные маршруты", "availableSeats": "Доступные места",
        "recentBookings": "Недавние бронирования", "upcomingFlights": "Ближайшие рейсы",
        "passenger": "Пассажир", "operationsOverview": "Обзор авиационных операций", "pnr": "PNR",
    },
    "about": {
        "startJourney": "Начать путешествие", "crafted": "Создано для современных путешествий",
        "missionLabel": "Наша миссия", "missionHeading": "Возвышать каждый полёт",
        "visionLabel": "Наше видение", "visionHeading": "Задать стандарт спокойной роскоши",
        "numbers": "AEROVA в цифрах",
    },
    "trips": {
        "upcomingTrips": "Предстоящие поездки", "pastTrips": "Прошедшие поездки",
        "viewDetails": "Подробнее", "changeBooking": "Изменить бронирование",
        "cancelBooking": "Отменить бронирование", "download": "Скачать", "print": "Печать",
    },
    "results": {"pageAria": "Результаты доступных рейсов"},
}


def load_locale(code: str) -> dict:
    text = (LOC / f"{code}.js").read_text(encoding="utf-8")
    m = re.search(r"= (\{.*\});\s*$", text, re.S)
    return json.loads(m.group(1))


def deep_merge(base: dict, overlay: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (overlay or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def write_locale(code: str, data: dict) -> None:
    content = (
        "window.AEROVA_LOCALES = window.AEROVA_LOCALES || {};\n"
        f"window.AEROVA_LOCALES.{code} = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    (LOC / f"{code}.js").write_text(content, encoding="utf-8")


def flatten(d: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, p))
        else:
            out[p] = str(v)
    return out


def reverse_map(flat: dict[str, str]) -> dict[str, str]:
    """Map English value -> key; skip ambiguous duplicates and short/non-letter values."""
    buckets: dict[str, list[str]] = {}
    for k, v in flat.items():
        val = " ".join(v.split())
        if len(val) < 2:
            continue
        if not re.search(r"[A-Za-zА-Яа-яƏəĞğİıÖöŞşÜüÇç]{2,}", val):
            continue
        # skip brand-ish / data-like
        if val in {"AEROVA", "Aerova", "PNR", "CVV", "Admin", "FAQs"}:
            continue
        buckets.setdefault(val, []).append(k)
    return {v: keys[0] for v, keys in buckets.items() if len(keys) == 1}


SKIP_TAG = re.compile(r"<(script|style|svg|path|meta|link|noscript)\b", re.I)


def auto_tag_html(en_flat: dict[str, str]) -> None:
    rev = reverse_map(en_flat)
    # Prefer certain keys for common labels
    preferred = {
        "Booking": "nav.booking",
        "Destinations": "nav.destinations",
        "Experience": "nav.experience",
        "About": "nav.about",
        "My Trips": "nav.myTrips",
        "Login": "nav.login",
        "Logout": "nav.logout",
        "Economy": "common.economy",
        "Comfort": "common.comfort",
        "Business": "common.business",
        "From": "common.from",
        "To": "common.to",
        "Search": "common.search",
        "Continue": "common.continue",
        "Cancel": "common.cancel",
        "Save": "common.save",
        "Email": "auth.email",
        "Password": "auth.password",
        "First Name": "auth.firstName",
        "Last Name": "auth.lastName",
    }
    for v, k in preferred.items():
        if v in rev or v in en_flat.values():
            rev[v] = k

    text_re = re.compile(r"(<([a-zA-Z0-9]+)([^>]*?)>)([^<>]+?)(</\2>)")

    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8", errors="replace")
        orig = html

        def repl(m: re.Match) -> str:
            open_tag, tag, attrs, content, close = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
            if SKIP_TAG.match(open_tag):
                return m.group(0)
            if "data-i18n" in attrs or "data-i18n-html" in attrs:
                return m.group(0)
            if tag.lower() in {"script", "style", "svg", "path", "code", "pre"}:
                return m.group(0)
            text = " ".join(content.split())
            if not text or text not in rev:
                return m.group(0)
            # Don't tag title tags with page titles containing |
            if tag.lower() == "title":
                return m.group(0)
            key = rev[text]
            # placeholders handled separately
            if tag.lower() == "option":
                new_open = f"<{tag}{attrs} data-i18n=\"{key}\">" if "data-i18n" not in attrs else open_tag
                return f"{new_open}{content}{close}"
            new_open = f"<{tag}{attrs} data-i18n=\"{key}\">"
            return f"{new_open}{content}{close}"

        html = text_re.sub(repl, html)

        # placeholders
        def ph_repl(m: re.Match) -> str:
            before, ph, after = m.group(1), m.group(2), m.group(3)
            if "data-i18n-placeholder" in before:
                return m.group(0)
            key = rev.get(ph)
            if not key:
                return m.group(0)
            return f'{before} data-i18n-placeholder="{key}" placeholder="{ph}"{after}'

        html = re.sub(r'(<[a-zA-Z0-9]+[^>]*?)(\splaceholder=")([^"]+)(")', lambda m: (
            m.group(0) if "data-i18n-placeholder" in m.group(1) or m.group(3) not in rev
            else f'{m.group(1)} data-i18n-placeholder="{rev[m.group(3)]}" placeholder="{m.group(3)}"{m.group(4) and ""}"'
        ), html)
        # simpler placeholder pass
        for ph, key in list(rev.items()):
            if '"' in ph:
                continue
            pattern = rf'(<(?:input|textarea)(?![^>]*data-i18n-placeholder)[^>]*?)\splaceholder="{re.escape(ph)}"'
            html = re.sub(pattern, rf'\1 data-i18n-placeholder="{key}" placeholder="{ph}"', html)

        if html != orig:
            path.write_text(html, encoding="utf-8")
            print("tagged", path.name)


def write_i18n_engine() -> None:
    engine = r'''(function () {
  var STORAGE_KEY = "language";
  var LEGACY_KEY = "aerovaLanguage";
  var SUPPORTED = { en: true, az: true, ru: true };
  var ORDER = ["en", "az", "ru"];

  function getDict(lang) {
    var all = window.AEROVA_LOCALES || {};
    return all[lang] || all.en || {};
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return String(str);
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : "{" + key + "}";
    });
  }

  function normalizeLang(lang) {
    lang = String(lang || "").toLowerCase();
    return SUPPORTED[lang] ? lang : "en";
  }

  function readStoredLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved == null || saved === "") {
        var legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          saved = legacy;
          try { localStorage.setItem(STORAGE_KEY, normalizeLang(legacy)); } catch (e1) {}
        } else {
          return "en";
        }
      }
      return normalizeLang(saved);
    } catch (e) {
      return "en";
    }
  }

  function writeStoredLanguage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(LEGACY_KEY, lang);
    } catch (e) {}
  }

  var currentLang = readStoredLanguage();

  function t(key, vars) {
    var value = getByPath(getDict(currentLang), key);
    if (value == null) value = getByPath(getDict("en"), key);
    if (value == null) return key;
    return interpolate(value, vars);
  }

  function applyToElement(el) {
    if (!el || el.nodeType !== 1) return;
    var key = el.getAttribute("data-i18n");
    if (key) {
      var translated = t(key);
      var tag = (el.tagName || "").toLowerCase();
      if (tag === "option" || tag === "input" || tag === "textarea" || tag === "button" || !el.children.length) {
        if (tag === "input" || tag === "textarea") {
          /* keep value attrs separate */
        } else {
          el.textContent = translated;
        }
        if (tag === "option" || tag === "button" || (tag !== "input" && tag !== "textarea" && !el.children.length)) {
          el.textContent = translated;
        }
      } else {
        var replaced = false;
        for (var i = 0; i < el.childNodes.length; i++) {
          var node = el.childNodes[i];
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = (node.textContent.match(/^\s*/) || [""])[0] + translated + (node.textContent.match(/\s*$/) || [""])[0];
            replaced = true;
            break;
          }
        }
        if (!replaced) el.setAttribute("aria-label", translated);
      }
    }
    var htmlKey = el.getAttribute("data-i18n-html");
    if (htmlKey) el.innerHTML = t(htmlKey);
    var ph = el.getAttribute("data-i18n-placeholder");
    if (ph) el.setAttribute("placeholder", t(ph));
    var aria = el.getAttribute("data-i18n-aria");
    if (aria) el.setAttribute("aria-label", t(aria));
    var title = el.getAttribute("data-i18n-title");
    if (title) el.setAttribute("title", t(title));
    var valueKey = el.getAttribute("data-i18n-value");
    if (valueKey) el.value = t(valueKey);
  }

  function applyTranslations(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll("[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-title],[data-i18n-value]");
    for (var i = 0; i < nodes.length; i++) applyToElement(nodes[i]);
    document.querySelectorAll("[data-lang-switcher] .lang-switcher-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.querySelectorAll("[data-lang-switcher]").forEach(function (g) {
      g.setAttribute("aria-label", t("common.language"));
    });
  }

  function buildSwitcher() {
    var wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.setAttribute("data-lang-switcher", "");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("common.language"));
    ORDER.forEach(function (code, index) {
      if (index > 0) {
        var divider = document.createElement("span");
        divider.className = "lang-switcher-divider";
        divider.setAttribute("aria-hidden", "true");
        wrap.appendChild(divider);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lang-switcher-btn" + (code === currentLang ? " is-active" : "");
      btn.setAttribute("data-lang", code);
      btn.setAttribute("aria-pressed", code === currentLang ? "true" : "false");
      btn.textContent = code.toUpperCase();
      btn.addEventListener("click", function () { setLanguage(code); });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function injectSwitcher() {
    var existing = document.querySelector("[data-lang-switcher]");
    if (existing) {
      // rebuild to ensure EN|AZ|RU order and active state
      var parent = existing.parentNode;
      if (parent) {
        var next = buildSwitcher();
        parent.replaceChild(next, existing);
      }
      return;
    }
    var headerActions = document.querySelector(".header-actions");
    if (headerActions) {
      var switcher = buildSwitcher();
      var insertBefore = headerActions.querySelector(".trips-link, .search-button, .login-button, .menu-toggle");
      if (insertBefore) headerActions.insertBefore(switcher, insertBefore);
      else headerActions.appendChild(switcher);
      return;
    }
    var authHeader = document.querySelector(".auth-header");
    if (authHeader) {
      var authLink = authHeader.querySelector(".auth-header-link");
      var sw = buildSwitcher();
      if (authLink) authHeader.insertBefore(sw, authLink);
      else authHeader.appendChild(sw);
      return;
    }
    var adminTopbar = document.querySelector(".admin-topbar");
    if (adminTopbar) {
      var meta = adminTopbar.querySelector(".admin-topbar-meta");
      var sw2 = buildSwitcher();
      if (meta && meta.parentNode) {
        var wrap = meta.parentNode.querySelector(".admin-topbar-meta-wrap");
        if (!wrap) {
          wrap = document.createElement("div");
          wrap.className = "admin-topbar-meta-wrap";
          meta.parentNode.insertBefore(wrap, meta);
          wrap.appendChild(meta);
        }
        wrap.insertBefore(sw2, wrap.firstChild);
      } else adminTopbar.appendChild(sw2);
    }
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    writeStoredLanguage(currentLang);
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
    try {
      window.dispatchEvent(new CustomEvent("aerova:languagechange", { detail: { language: currentLang } }));
    } catch (e) {}
  }

  function getLanguage() { return currentLang; }

  function init() {
    if (!SUPPORTED[currentLang]) currentLang = "en";
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
  }

  window.AEROVA_I18N = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    init: init
  };
  window.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
'''
    (JS / "i18n.js").write_text(engine, encoding="utf-8")
    print("Wrote i18n.js with language key + EN|AZ|RU order")


def main() -> None:
    en = load_locale("en")
    az = load_locale("az")
    ru = load_locale("ru")

    en = deep_merge(en, EXTRA_EN)
    # rebuild AZ extras carefully (fix duplicated common)
    az_extra = copy.deepcopy(EXTRA_AZ)
    # EXTRA_AZ accidentally has two "common" entries in source - Python keeps last; ensure months etc exist
    az = deep_merge(az, az_extra)
    # Also merge EN structure so AZ has all keys (fallback to EN then overlay)
    az = deep_merge(en, az)
    # Re-apply AZ overlay on top so translations win
    az = deep_merge(az, az_extra)

    ru = deep_merge(en, ru)
    ru = deep_merge(ru, EXTRA_RU)

    # Ensure key parity: any EN key missing in AZ/RU gets EN value temporarily then we already merged
    write_locale("en", en)
    write_locale("az", az)
    write_locale("ru", ru)
    print("Locales updated. EN keys:", len(flatten(en)))

    write_i18n_engine()
    auto_tag_html(flatten(en))

    # Explicit register page marks
    reg = ROOT / "register.html"
    if reg.exists():
        html = reg.read_text(encoding="utf-8")
        reps = [
            (r'(class="auth-eyebrow")(?![^>]*data-i18n)(>)Join AEROVA(</p>)',
             r'\1 data-i18n="auth.registerEyebrow"\2Join AEROVA\3'),
            (r'(class="auth-title")(?![^>]*data-i18n)(>)Create your account(</h1>)',
             r'\1 data-i18n="auth.registerTitle"\2Create your account\3'),
            (r'(class="auth-subtitle")(?![^>]*data-i18n)(>)Register to manage bookings and personalized travel details\.(</p>)',
             r'\1 data-i18n="auth.registerSubtitle"\2Register to manage bookings and personalized travel details.\3'),
            (r'(for="register-first-name")(?![^>]*data-i18n)(>)First Name(</label>)',
             r'\1 data-i18n="auth.firstName"\2First Name\3'),
            (r'(for="register-last-name")(?![^>]*data-i18n)(>)Last Name(</label>)',
             r'\1 data-i18n="auth.lastName"\2Last Name\3'),
            (r'(for="register-email")(?![^>]*data-i18n)(>)Email(</label>)',
             r'\1 data-i18n="auth.email"\2Email\3'),
            (r'(for="register-password")(?![^>]*data-i18n)(>)Password(</label>)',
             r'\1 data-i18n="auth.password"\2Password\3'),
            (r'(for="register-confirm-password")(?![^>]*data-i18n)(>)Confirm Password(</label>)',
             r'\1 data-i18n="auth.confirmPassword"\2Confirm Password\3'),
            (r'(class="auth-submit")(?![^>]*data-i18n)( type="submit">)Create Account(</button>)',
             r'\1 data-i18n="auth.createAccount"\2Create Account\3'),
            (r'(Already have an account\?)', r'<span data-i18n="auth.hasAccount">Already have an account?</span>'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)
        # placeholders
        html = re.sub(r'(id="register-first-name"[^>]*?)(\splaceholder="First name")',
                      r'\1 data-i18n-placeholder="auth.firstNamePh" placeholder="First name"', html)
        html = re.sub(r'(id="register-last-name"[^>]*?)(\splaceholder="Last name")',
                      r'\1 data-i18n-placeholder="auth.lastNamePh" placeholder="Last name"', html)
        html = re.sub(r'(id="register-email"[^>]*?)(\splaceholder="you@email.com")',
                      r'\1 data-i18n-placeholder="auth.emailPlaceholder" placeholder="you@email.com"', html)
        html = re.sub(r'(id="register-password"[^>]*?)(\splaceholder="At least 6 characters")',
                      r'\1 data-i18n-placeholder="auth.passwordPhLong" placeholder="At least 6 characters"', html)
        html = re.sub(r'(id="register-confirm-password"[^>]*?)(\splaceholder="Repeat password")',
                      r'\1 data-i18n-placeholder="auth.confirmPh" placeholder="Repeat password"', html)
        reg.write_text(html, encoding="utf-8")
        print("register.html marked")


if __name__ == "__main__":
    main()
