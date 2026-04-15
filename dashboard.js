// ════════════════════════════════════════════════════════════
// BUSINESS DASHBOARD + EDIT
// ════════════════════════════════════════════════════════════

let currentBiz = null; // текущий бизнес пользователя

// ══════════════════════════════════════════════════════════════
// КАТЕГОРИИ УСЛУГ (множественный выбор для специалистов)
// ══════════════════════════════════════════════════════════════
const BIZ_SERVICE_CATEGORIES = [
  { id: 'trainer', label: 'Кинолог / Тренер', icon: '🐕' },
  { id: 'grooming', label: 'Груминг', icon: '✂️' },
  { id: 'boarding', label: 'Передержка', icon: '🏠' },
  { id: 'psychologist', label: 'Зоопсихолог', icon: '🧠' },
  { id: 'walking', label: 'Выгул собак', icon: '🚶' }
];

// Поля для каждого типа
const BIZ_FIELDS = {
  trainer: {
    icon: '🐕',
    label: 'Кинолог / Тренер',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО / Название',      type: 'text',     placeholder: 'Иван Петров', required: true },
          { id: 'description', label: 'О себе',               type: 'textarea', placeholder: 'Опыт работы, специализация, подход...' },
          { id: 'address',     label: 'Район / Место занятий',type: 'text',     placeholder: 'Сокольники, Москва', required: true },
          { id: 'price_from',  label: 'Цена от (общая, если не указана у услуги)', type: 'text',     placeholder: '3 000 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',   type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',     type: 'email', placeholder: 'trainer@mail.ru' },
          { id: 'telegram', label: 'Telegram',  type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',      type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '🎓 Специализация',
        fields: [
          { id: 'experience',   label: 'Опыт работы',           type: 'text',     placeholder: '5 лет' },
          { id: 'education',    label: 'Образование / сертификаты', type: 'textarea', placeholder: 'РКФ, МDSA...' },
          { id: 'dog_breeds',   label: 'Породы (специализация)', type: 'text',     placeholder: 'Все породы, МБС, лабрадор...' },
          { id: 'lesson_format',label: 'Формат занятий',         type: 'text',     placeholder: 'Индивидуально, группа, выезд' },
          { id: 'area',         label: 'Рабочая зона (км)',       type: 'text',     placeholder: '10 км от метро Сокольники' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['ОКД','Щенки (3-6 мес)','Послушание','Аджилити','Коррекция поведения','Социализация','Защитная служба','Норматив','Выезд на дом','Онлайн-консультация']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Пт 10:00–19:00, Сб 10:00–15:00' },
        ]
      },
    ]
  },
  clinic: {
    icon: '🏥',
    label: 'Ветеринарная клиника',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название клиники', type: 'text',     placeholder: 'Ветклиника «Здоровый пёс»', required: true },
          { id: 'description', label: 'О клинике',        type: 'textarea', placeholder: 'Специализация, оборудование, опыт...' },
          { id: 'address',     label: 'Адрес',            type: 'text',     placeholder: 'ул. Ленина, 10, Москва', required: true },
          { id: 'price_from',  label: 'Приём от',         type: 'text',     placeholder: '1 500 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',     label: 'Телефон',        type: 'tel',   placeholder: '+7 (495) 123-45-67', required: true },
          { id: 'phone2',    label: 'Доп. телефон',   type: 'tel',   placeholder: '+7 (495) 765-43-21' },
          { id: 'email',     label: 'Email',          type: 'email', placeholder: 'info@vetclinic.ru' },
          { id: 'website',   label: 'Сайт',           type: 'url',   placeholder: 'https://...' },
          { id: 'telegram',  label: 'Telegram / WhatsApp', type: 'text', placeholder: '@vetclinic' },
        ]
      },
      {
        title: '🏥 Специализация',
        fields: [
          { id: 'experience',  label: 'Лет на рынке',        type: 'text',     placeholder: 'Работаем с 2015 года' },
          { id: 'doctors',     label: 'Кол-во врачей',       type: 'text',     placeholder: '8 специалистов' },
          { id: 'equipment',   label: 'Оборудование',        type: 'textarea', placeholder: 'УЗИ, рентген, анализаторы...' },
          { id: 'emergency',   label: 'Скорая помощь',       type: 'text',     placeholder: 'Круглосуточно / Нет' },
          { id: 'area',        label: 'Обслуживаемые районы',type: 'text',     placeholder: 'Сокольники, Преображенское...' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Терапия','Хирургия','Стоматология','Вакцинация','Анализы','УЗИ','Рентген','Дерматология','Офтальмология','Онкология','Кардиология','Неврология','Чипирование','Кастрация / стерилизация','Скорая помощь 24/7']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Пт 9:00–21:00\nСб-Вс 10:00–18:00' },
        ]
      },
    ]
  },
  cafe: {
    icon: '☕',
    label: 'Dog-friendly место',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название места',  type: 'text',     placeholder: 'Кафе «Рыжий пёс»', required: true },
          { id: 'description', label: 'Описание',        type: 'textarea', placeholder: 'Атмосфера, кухня, особенности...' },
          { id: 'address',     label: 'Адрес',           type: 'text',     placeholder: 'ул. Арбат, 25, Москва', required: true },
          { id: 'price_from',  label: 'Средний чек',     type: 'text',     placeholder: '800 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',             type: 'tel',   placeholder: '+7 (495) 123-45-67', required: true },
          { id: 'email',    label: 'Email',               type: 'email', placeholder: 'hello@cafe.ru' },
          { id: 'website',  label: 'Сайт / меню',         type: 'url',   placeholder: 'https://...' },
          { id: 'instagram',label: 'Instagram',           type: 'text',  placeholder: '@dogcafe_moscow' },
          { id: 'telegram', label: 'Telegram',            type: 'text',  placeholder: '@dogcafe' },
        ]
      },
      {
        title: '🐕 Условия для собак',
        fields: [
          { id: 'dog_policy',   label: 'Политика для собак', type: 'textarea', placeholder: 'Все породы, только на поводке, до 30 кг...' },
          { id: 'max_dog_size', label: 'Макс. размер собаки',type: 'text',     placeholder: 'Без ограничений / до 30 кг / только мелкие' },
          { id: 'dog_menu',     label: 'Меню для собак',     type: 'text',     placeholder: 'Лакомства, миски с водой, корм' },
          { id: 'area',         label: 'Зона для собак',     type: 'text',     placeholder: 'Терраса, весь зал, только улица' },
        ]
      },
      {
        title: '✅ Удобства',
        type: 'checkboxes',
        id: 'services',
        options: ['Веранда','Миски с водой','Лакомства в меню','Wi-Fi','Детская зона','Парковка','Доставка','Бронирование столов','Кальян','Живая музыка','Своя пивоварня','Специальное меню для собак']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Ежедневно 10:00–23:00' },
        ]
      },
    ]
  },
  shop: {
    icon: '🛍️',
    label: 'Зоомагазин',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название магазина', type: 'text',     placeholder: 'Зоомагазин "Лапки"', required: true },
          { id: 'description', label: 'О магазине',        type: 'textarea', placeholder: 'Что продаёте, особенности, ассортимент...' },
          { id: 'address',     label: 'Адрес',             type: 'text',     placeholder: 'Москва, ул. Ленина 10', required: true },
          { id: 'schedule',    label: 'Режим работы',      type: 'text',     placeholder: 'Пн-Вс 10:00–20:00' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'shop@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',     type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '✅ Категории товаров',
        type: 'checkboxes',
        id: 'services',
        options: ['Корма','Игрушки','Одежда','Аксессуары','Поводки и ошейники','Витамины','Лакомства','Переноски','Лежанки','Гигиена']
      },
    ]
  },

  psychologist: {
    icon: '🧠',
    label: 'Зоопсихолог',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО / Название',        type: 'text',     placeholder: 'Мария Иванова', required: true },
          { id: 'description', label: 'О себе',                 type: 'textarea', placeholder: 'Специализация, подход, опыт...' },
          { id: 'address',     label: 'Район / Место приёма',   type: 'text',     placeholder: 'Москва, Сокольники', required: true },
          { id: 'price_from',  label: 'Цена консультации от',   type: 'text',     placeholder: '3 000 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'zoo@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',     type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '🎓 Специализация',
        fields: [
          { id: 'experience',    label: 'Опыт работы',              type: 'text',     placeholder: '7 лет' },
          { id: 'education',     label: 'Образование / сертификаты', type: 'textarea', placeholder: 'IAABC, APDT...' },
          { id: 'dog_breeds',    label: 'Породы (специализация)',    type: 'text',     placeholder: 'Все породы' },
          { id: 'lesson_format', label: 'Формат работы',            type: 'text',     placeholder: 'Выезд, онлайн, в кабинете' },
          { id: 'area',          label: 'Рабочая зона',             type: 'text',     placeholder: 'Москва и область' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Коррекция агрессии','Страхи и фобии','Разлучение с хозяином','Гиперактивность','Апатия / депрессия','Социализация','Онлайн-консультация','Выезд на дом','Работа с щенками','Посттравматика']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Пт 10:00–19:00' },
        ]
      },
    ]
  },

  grooming: {
    icon: '✂️',
    label: 'Груминг',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО / Название салона', type: 'text',     placeholder: 'Салон "Красивый пёс"', required: true },
          { id: 'description', label: 'О салоне / мастере',    type: 'textarea', placeholder: 'Опыт, специализация, условия...' },
          { id: 'address',     label: 'Адрес',                 type: 'text',     placeholder: 'Москва, ул. Ленина 10', required: true },
          { id: 'price_from',  label: 'Стрижка от',            type: 'text',     placeholder: '2 000 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'grooming@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
          { id: 'instagram',label: 'Instagram',type: 'text',  placeholder: '@grooming_salon' },
          { id: 'website',  label: 'Сайт',     type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '✂️ Специализация',
        fields: [
          { id: 'experience',  label: 'Опыт работы',           type: 'text',     placeholder: '5 лет' },
          { id: 'dog_breeds',  label: 'Породы (специализация)', type: 'text',     placeholder: 'Все породы / Пудель, Йорк...' },
          { id: 'area',        label: 'Выезд на дом',          type: 'text',     placeholder: 'Есть / Нет / Районы' },
          { id: 'lesson_format',label: 'Формат',               type: 'text',     placeholder: 'Салон / Выезд / Оба' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Стрижка','Мытьё','Тримминг','Подстригание когтей','Чистка ушей','Чистка зубов','Спа-процедуры','Покраска шерсти','Плетение косичек','Выезд на дом','Экспресс-груминг']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Сб 9:00–20:00' },
        ]
      },
    ]
  },

  boarding: {
    icon: '🏠',
    label: 'Передержка / Догситтинг',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО / Название',       type: 'text',     placeholder: 'Анна Петрова', required: true },
          { id: 'description', label: 'О себе / услуге',       type: 'textarea', placeholder: 'Условия, опыт, количество животных...' },
          { id: 'address',     label: 'Район',                 type: 'text',     placeholder: 'Москва, Митино', required: true },
          { id: 'price_from',  label: 'Цена в сутки от',       type: 'text',     placeholder: '1 000 ₽/сут' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'boarding@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
        ]
      },
      {
        title: '🐕 Условия',
        fields: [
          { id: 'experience',   label: 'Опыт',                    type: 'text',     placeholder: '3 года' },
          { id: 'max_dog_size', label: 'Размер собак',            type: 'text',     placeholder: 'До 30 кг / Любой' },
          { id: 'dog_breeds',   label: 'Ограничения по породам',  type: 'text',     placeholder: 'Нет / Только мелкие' },
          { id: 'area',         label: 'Макс. количество собак',  type: 'text',     placeholder: '2 собаки одновременно' },
          { id: 'dog_policy',   label: 'Условия проживания',      type: 'textarea', placeholder: 'Живём в квартире, есть двор...' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Дневная передержка','Длительная передержка','Ночная передержка','Уход за щенками','Выгул','Игры и активности','Видеоотчёты','Приём лекарств','Купание','Груминг']
      },
      {
        title: '🕐 Доступность',
        fields: [
          { id: 'schedule', label: 'График приёма', type: 'textarea', placeholder: 'Круглосуточно / Пн-Вс 8:00–22:00' },
        ]
      },
    ]
  },

  walking: {
    icon: '🚶',
    label: 'Выгул собак',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО',              type: 'text',     placeholder: 'Иван Сидоров', required: true },
          { id: 'description', label: 'О себе',            type: 'textarea', placeholder: 'Опыт, подход, маршруты...' },
          { id: 'address',     label: 'Район работы',      type: 'text',     placeholder: 'Москва, Хорошево-Мнёвники', required: true },
          { id: 'price_from',  label: 'Цена прогулки от',  type: 'text',     placeholder: '500 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'walker@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
        ]
      },
      {
        title: '🐕 О прогулках',
        fields: [
          { id: 'experience',    label: 'Опыт',                   type: 'text',     placeholder: '2 года' },
          { id: 'max_dog_size',  label: 'Размер собак',           type: 'text',     placeholder: 'До 40 кг / Любой' },
          { id: 'dog_breeds',    label: 'Ограничения по породам', type: 'text',     placeholder: 'Нет ограничений' },
          { id: 'area',          label: 'Рабочая зона',           type: 'text',     placeholder: 'Хорошево, Щукино, Строгино' },
          { id: 'lesson_format', label: 'Длительность прогулки',  type: 'text',     placeholder: '60 мин / 90 мин' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Индивидуальный выгул','Групповой выгул','Активные прогулки','Социализация на прогулке','Дрессировка на прогулке','Отчёт фото/видео','Выезд к клиенту','Утренние прогулки','Вечерние прогулки']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Вс 7:00–21:00' },
        ]
      },
    ]
  },

  training_ground: {
    icon: '⭐',
    label: 'Дрессировочная площадка',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название площадки', type: 'text',     placeholder: 'Площадка "Чемпион"', required: true },
          { id: 'description', label: 'О площадке',        type: 'textarea', placeholder: 'Оборудование, покрытие, размер...' },
          { id: 'address',     label: 'Адрес',             type: 'text',     placeholder: 'Москва, парк Сокольники', required: true },
          { id: 'price_from',  label: 'Аренда от',         type: 'text',     placeholder: '500 ₽/час' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'ground@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',     type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '🏟️ О площадке',
        fields: [
          { id: 'area',         label: 'Площадь / размер',      type: 'text',     placeholder: '500 м²' },
          { id: 'dog_policy',   label: 'Покрытие',              type: 'text',     placeholder: 'Трава / Резина / Грунт' },
          { id: 'max_dog_size', label: 'Ограждение',            type: 'text',     placeholder: 'Полностью огорожена / Частично' },
          { id: 'equipment',    label: 'Оборудование',          type: 'textarea', placeholder: 'Снаряды аджилити, барьеры, бум...' },
          { id: 'lesson_format',label: 'Освещение',             type: 'text',     placeholder: 'Есть / Нет' },
        ]
      },
      {
        title: '✅ Активности',
        type: 'checkboxes',
        id: 'services',
        options: ['Аджилити','ОКД','Фрисби','Свободный выгул','Групповые занятия','Индивидуальные занятия','IPO / Защитная служба','Флайбол','Аренда без тренера','С инструктором']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Вс 8:00–22:00' },
        ]
      },
    ]
  },
};

// Загрузить бизнес пользователя и показать кнопку в профиле
let userBusinesses = [];

async function checkUserBusiness() {
  if (!supabaseClient || !currentUser) {
    console.log('checkUserBusiness: waiting for supabase/user...');
    return;
  }
  try {
    console.log('Checking business for user:', currentUser.id);
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    console.log('Business query result:', JSON.stringify(data), error);

    if (error) { console.error('checkUserBusiness error:', error); return; }

    if (data && data.length > 0) {
      userBusinesses = data;
      currentBiz = data[0];
      const row = document.getElementById('biz-mgmt-row');
      if (row) { row.style.display = 'flex'; console.log('Business button shown, found:', data.length); }
    } else {
      console.log('No businesses found for user:', currentUser.id);
    }
  } catch(e) {
    console.error('checkUserBusiness exception:', e);
  }
}

function renderBizDashboard(biz) {
  currentBiz = biz;
  const cfg = BIZ_FIELDS[biz.type];
  const typeIcons  = { trainer: '🐕', clinic: '🏥', cafe: '☕', shop: '🛍️', psychologist: '🧠', grooming: '✂️', boarding: '🏠', walking: '🚶', training_ground: '⭐' };
  const typeLabels = { trainer: 'Кинолог / Тренер', clinic: 'Ветеринарная клиника', cafe: 'Dog-friendly место', shop: 'Магазин', psychologist: 'Зоопсихолог', grooming: 'Груминг', boarding: 'Передержка / Догситтинг', walking: 'Выгул собак', training_ground: 'Дрессировочная площадка' };
  const SERVICE_LABELS = {
    trainer: 'Кинолог / Тренер', grooming: 'Груминг', boarding: 'Передержка',
    psychologist: 'Зоопсихолог', walking: 'Выгул', training_ground: 'Площадка',
    'Онлайн-консультация': 'Онлайн-консультация'
  };

  document.getElementById('biz-dash-title').textContent = '💼 Мой бизнес';

  // Переключатель если несколько бизнесов
  let switcherHtml = '';
  if (userBusinesses.length > 1) {
    switcherHtml = `<div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;margin-bottom:16px;">` +
      userBusinesses.map((b, i) => {
        const icon = typeIcons[b.type] || '💼';
        const active = b.id === biz.id;
        return `<div onclick="renderBizDashboard(userBusinesses[${i}])" style="flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;border:2px solid ${active ? 'var(--primary)' : 'var(--border)'};background:${active ? 'var(--primary)' : 'var(--white)'};cursor:pointer;font-size:13px;font-weight:700;color:${active ? 'white' : 'var(--text-secondary)'};">
          <span>${icon}</span><span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.name}</span>
        </div>`;
      }).join('') + `</div>`;
  }

  let html = switcherHtml;

  // Шапка бизнеса
  const avatarHtml = biz.cover_url
    ? `<img src="${biz.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<span style="font-size:28px;">${typeIcons[biz.type] || '💼'}</span>`;

  const statusBadge = biz.is_approved
    ? `<span style="background:rgba(52,199,89,0.2);color:#34C759;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">✓ Опубликовано</span>`
    : `<span style="background:rgba(255,149,0,0.2);color:#FF9500;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">⏳ На модерации</span>`;

  html += `<div style="background:linear-gradient(135deg,#4A90D9,#7B5EA7);border-radius:20px;padding:20px;color:white;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:3px solid rgba(255,255,255,0.35);">
        ${avatarHtml}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:19px;font-weight:800;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${biz.name}</div>
        <div style="font-size:13px;opacity:0.85;margin-bottom:8px;">${typeLabels[biz.type] || ''}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${statusBadge}<span style="font-size:13px;opacity:0.85;">⭐ ${biz.rating || '5.0'} · ${biz.reviews_count || 0} отз.</span></div>
      </div>
    </div>
  </div>`;

  // Статистика
  const msgCount = Object.values(privateChats || {}).reduce((sum, msgs) => sum + msgs.length, 0);
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
    <div style="background:var(--white);border-radius:16px;padding:14px 8px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="font-size:20px;margin-bottom:4px;">👁</div>
      <div style="font-size:22px;font-weight:900;color:#4A90D9;font-family:'Nunito',sans-serif;">0</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-top:2px;">Просмотры</div>
    </div>
    <div style="background:var(--white);border-radius:16px;padding:14px 8px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="font-size:20px;margin-bottom:4px;">💬</div>
      <div style="font-size:22px;font-weight:900;color:#7B5EA7;font-family:'Nunito',sans-serif;">${msgCount}</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-top:2px;">Сообщений</div>
    </div>
    <div style="background:var(--white);border-radius:16px;padding:14px 8px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="font-size:20px;margin-bottom:4px;">📅</div>
      <div style="font-size:22px;font-weight:900;color:#34C759;font-family:'Nunito',sans-serif;">0</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-top:2px;">Записей</div>
    </div>
  </div>`;

  // Быстрые действия
  html += `<div style="display:flex;gap:10px;margin-bottom:16px;">
    <button onclick="openBizSettings()" style="flex:1;padding:14px;background:var(--primary);color:white;border:none;border-radius:16px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Редактировать
    </button>
    <button onclick="openCreatePromo()" style="flex:1;padding:14px;background:var(--white);color:var(--primary);border:2px solid var(--primary);border-radius:16px;font-size:14px;font-weight:700;cursor:pointer;">
      🎁 Акция
    </button>
  </div>`;

  // Категории услуг (trainer)
  if (biz.type === 'trainer' && biz.is_approved) {
    const currentServices = biz.services || [];
    html += `<div style="background:var(--white);border-radius:18px;padding:18px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="font-size:15px;font-weight:800;margin-bottom:4px;">🎯 Мои услуги</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">Нажмите чтобы добавить/убрать. Цены — в «Редактировать»</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;" id="service-categories-container">
        ${BIZ_SERVICE_CATEGORIES.map(cat => {
          const isSelected = currentServices.some(s => (typeof s === 'string' ? s : s.name) === cat.id);
          return `<div onclick="toggleServiceCategory('${cat.id}')" id="service-cat-${cat.id}"
            style="padding:9px 16px;border-radius:20px;border:2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'};background:${isSelected ? 'var(--primary)' : 'var(--bg)'};color:${isSelected ? 'white' : 'var(--text-secondary)'};font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
            <span>${cat.icon}</span><span>${cat.label}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Информация по секциям — только заполненные поля
  if (cfg) {
    cfg.sections.forEach(sec => {
      let secContent = '';
      if (sec.type === 'checkboxes') {
        const vals = biz[sec.id] || [];
        if (vals.length) {
          secContent = `<div style="display:flex;flex-direction:column;gap:6px;">${vals.map(v => {
            const name = typeof v === 'string' ? v : v.name;
            const price = typeof v === 'object' && v.price ? v.price : '';
            const label = SERVICE_LABELS[name] || name;
            return `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(74,144,217,0.06);padding:8px 14px;border-radius:12px;">
              <span style="font-size:13px;font-weight:600;color:var(--primary);">${label}</span>
              ${price ? `<span style="font-size:13px;font-weight:700;color:var(--text-primary);">${price}</span>` : ''}
            </div>`;
          }).join('')}</div>`;
        }
      } else {
        const filledFields = sec.fields.filter(f => biz[f.id]);
        if (filledFields.length) {
          secContent = `<div style="display:flex;flex-direction:column;">` + filledFields.map(f => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">
              <span style="font-size:13px;color:var(--text-secondary);flex-shrink:0;margin-right:12px;">${f.label}</span>
              <span style="font-size:13px;font-weight:600;text-align:right;max-width:60%;">${biz[f.id]}</span>
            </div>`).join('') + `</div>`;
        }
      }
      if (!secContent) return;
      html += `<div style="background:var(--white);border-radius:18px;padding:18px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">${sec.title}</div>
        ${secContent}
      </div>`;
    });
  }

  // Товары для магазинов
  if (biz.type === 'shop') {
    html += renderBizDashboardShop(biz);
  }

  document.getElementById('biz-dash-content').innerHTML = html;
  renderBizPromos(biz);

  if (biz.type === 'shop') {
    loadBizProducts(biz.id);
  }
}

async function renderBizPromos(biz) {
  const container = document.getElementById('biz-dash-content');
  if (!container || !supabaseClient) return;
  const { data: promos } = await supabaseClient.from('promotions').select('*').eq('business_id', biz.id).order('created_at', { ascending: false });
  let h = `<div style="background:var(--white);border-radius:var(--radius);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-size:15px;font-weight:800;">Мои акции</div>
      <button class="btn btn-p" style="width:auto;height:34px;padding:0 14px;font-size:12px;border-radius:10px;" onclick="openCreatePromo()">+ Создать</button>
    </div>`;
  if (promos && promos.length) {
    h += promos.map(p => `<div style="padding:12px 0;border-top:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><div style="font-weight:700;font-size:14px;">${p.title}</div><div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${p.discount_percent?'-'+p.discount_percent+'%':''} ${p.promo_code?'· Код: '+p.promo_code:''} ${p.valid_until?'· До '+p.valid_until:''}</div></div>
        <span class="tag ${p.is_active?'tag-g':'tag-o'}" style="font-size:11px;">${p.is_active?'Активна':'Выкл'}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn btn-sm btn-g" onclick="toggleMyPromo('${p.id}',${!p.is_active})">${p.is_active?'Выключить':'Включить'}</button>
        <button class="btn btn-sm" style="background:rgba(208,2,27,0.08);color:var(--error);border-radius:10px;" onclick="deleteMyPromo('${p.id}')">Удалить</button>
      </div></div>`).join('');
  } else { h += '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:13px;">Нет акций. Создайте первую!</div>'; }
  h += '</div>';
  container.insertAdjacentHTML('beforeend', h);
}
async function toggleMyPromo(id,active){await supabaseClient.from('promotions').update({is_active:active}).eq('id',id);showToast(active?'Включена':'Выключена');renderBizDashboard(currentBiz)}
async function deleteMyPromo(id){if(!confirm('Удалить акцию?'))return;await supabaseClient.from('promotions').delete().eq('id',id);showToast('Удалена');renderBizDashboard(currentBiz)}
function openCreatePromo(){
  if(!currentBiz)return;
  let m=document.getElementById('m-create-promo');
  if(!m){m=document.createElement('div');m.className='modal-ov';m.id='m-create-promo';m.onclick=()=>closeModal('m-create-promo');
  m.innerHTML=`<div class="modal" onclick="event.stopPropagation()" style="max-height:90%;overflow-y:auto;"><div class="mhandle"></div><div id="m-promo-body"></div></div>`;
  document.querySelector('.phone-shell').appendChild(m);}
  document.getElementById('m-promo-body').innerHTML=`
    <h3 style="margin-bottom:16px;">Новая акция</h3>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">
      <div><label class="lbl">Название *</label><input class="input" id="promo-title" placeholder="Скидка 20% на первое занятие"></div>
      <div><label class="lbl">Описание</label><textarea class="input" id="promo-desc" placeholder="Подробности..." style="min-height:60px;padding:12px;"></textarea></div>
      <div style="display:flex;gap:10px;"><div style="flex:1;"><label class="lbl">Скидка %</label><input class="input" id="promo-pct" type="number" placeholder="20"></div><div style="flex:1;"><label class="lbl">Промокод</label><input class="input" id="promo-code" placeholder="DOGLY20" style="text-transform:uppercase;"></div></div>
      <div><label class="lbl">Категория</label><select class="input" id="promo-cat" style="padding:0 12px;"><option value="">Выберите</option><option value="Груминг">Груминг</option><option value="Питание">Питание</option><option value="Аксессуары">Аксессуары</option><option value="Ветеринар">Ветеринар</option><option value="Кафе">Кафе</option><option value="Другое">Другое</option></select></div>
      <div><label class="lbl">Действует до</label><input class="input" id="promo-until" placeholder="31 декабря 2026"></div>
    </div>
    <button class="btn btn-p" onclick="submitPromo()" style="margin-bottom:8px;">Создать акцию</button>
    <button class="btn btn-g" onclick="closeModal('m-create-promo')">Отмена</button>`;
  openModal('m-create-promo');
}
async function submitPromo(){
  if(!currentBiz||!supabaseClient)return;
  const t=document.getElementById('promo-title').value.trim();if(!t){showToast('Введите название');return}
  try{const{error}=await supabaseClient.from('promotions').insert({business_id:currentBiz.id,title:t,description:document.getElementById('promo-desc').value.trim(),discount_percent:parseInt(document.getElementById('promo-pct').value)||null,promo_code:(document.getElementById('promo-code').value.trim().toUpperCase())||null,category:document.getElementById('promo-cat').value||null,valid_until:document.getElementById('promo-until').value.trim()||null,is_active:true});
  if(error)throw error;closeModal('m-create-promo');showToast('Акция создана!','#34C759');renderBizDashboard(currentBiz)}catch(e){showToast('Ошибка: '+(e.message||''))}
}

function openBusinessDashboard() {
  if (!userBusinesses.length) { showToast('Бизнес не найден'); return; }
  renderBizDashboard(userBusinesses[0]);
  nav('bizDashboard');
}

async function openBizEdit() {
  if (!currentBiz) return;
  const cfg = BIZ_FIELDS[currentBiz.type];
  if (!cfg) return;
  document.getElementById('biz-edit-title').textContent = 'Редактировать: ' + currentBiz.name;

  // Загружаем текущие адреса из business_locations
  let existingLocs = [];
  try {
    const { data: locs } = await supabaseClient
      .from('business_locations')
      .select('*')
      .eq('business_id', currentBiz.id)
      .order('is_main', { ascending: false });
    existingLocs = locs || [];
  } catch(e) {}

  let html = '';
  
  // Блок загрузки обложки
  html += `<div style="margin-bottom:20px;">
    <div style="font-size:15px;font-weight:800;margin-bottom:12px;padding-top:16px;border-top:2px solid var(--border);">📷 Обложка бизнеса</div>
    <div id="biz-cover-preview" style="margin-bottom:8px;">
      ${currentBiz.cover_url ? `<img src="${currentBiz.cover_url}" style="width:120px;height:120px;object-fit:cover;border-radius:16px;display:block;">` : '<div style="background:var(--bg);border-radius:12px;padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">Нет обложки</div>'}
    </div>
    <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:var(--bg);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
      📸 Выбрать фото
      <input type="file" accept="image/*" onchange="handleBusinessCoverSelect(event)" style="display:none;">
    </label>
  </div>`;

  cfg.sections.forEach(sec => {
    html += `<div style="margin-bottom:20px;">
      <div style="font-size:15px;font-weight:800;margin-bottom:12px;padding-top:16px;border-top:2px solid var(--border);">${sec.title}</div>`;

    if (sec.type === 'checkboxes') {
      const vals = currentBiz[sec.id] || [];
      html += `<div style="display:flex;flex-direction:column;gap:8px;" id="biz-edit-checks-${sec.id}">`;
      sec.options.forEach(opt => {
        // Поддержка старого формата (строки) и нового (объекты {name, price})
        const svcObj = vals.find(v => (typeof v === 'string' ? v : v.name) === opt);
        const checked = !!svcObj;
        const svcPrice = (svcObj && typeof svcObj === 'object') ? (svcObj.price || '') : '';
        html += `<label style="display:flex;align-items:center;gap:8px;background:${checked ? 'rgba(74,144,217,0.1)' : 'var(--bg)'};border:2px solid ${checked ? 'var(--primary)' : 'var(--border)'};border-radius:12px;padding:8px 12px;cursor:pointer;transition:all 0.15s;" onclick="toggleBizCheck(this,'${sec.id}')">
          <input type="checkbox" value="${opt}" ${checked ? 'checked' : ''} style="display:none;">
          <span style="font-size:13px;font-weight:600;flex:1;">${opt}</span>
          <input type="text" class="svc-price-input" data-svc="${opt}" value="${svcPrice}" placeholder="Цена" onclick="event.stopPropagation()" style="width:90px;height:32px;border:1.5px solid var(--border);border-radius:8px;padding:0 8px;font-size:12px;font-family:inherit;text-align:right;background:var(--white);outline:none;">
        </label>`;
      });
      html += `</div>`;
    } else {
      sec.fields.forEach(f => {
        // Поле address — заменяем на динамический список адресов
        if (f.id === 'address') {
          const addrRows = existingLocs.length
            ? existingLocs.map((loc, i) => `
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;" id="biz-addr-row-${i}">
                <input type="text" class="input biz-addr-input" value="${loc.address || ''}" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
                ${i > 0 ? `<button type="button" onclick="this.parentElement.remove()" style="width:44px;height:44px;background:var(--bg);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;font-size:20px;color:var(--text-secondary);flex-shrink:0;">×</button>` : ''}
              </div>`).join('')
            : `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <input type="text" class="input biz-addr-input" value="${currentBiz.address || ''}" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
              </div>`;

          html += `<div style="margin-bottom:12px;">
            <label class="lbl">${f.label}${f.required ? ' *' : ''}</label>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Укажите полный адрес с городом</div>
            <div id="biz-addresses-list">${addrRows}</div>
            <button type="button" onclick="addBizAddressRow()" style="background:none;border:1.5px dashed var(--border);border-radius:12px;padding:10px 16px;font-size:13px;font-weight:600;color:var(--primary);cursor:pointer;width:100%;margin-top:4px;">+ Добавить адрес</button>
          </div>`;
        } else {
          const val = currentBiz[f.id] || '';
          if (f.type === 'textarea') {
            html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><textarea class="input" id="biz-f-${f.id}" placeholder="${f.placeholder}" style="min-height:72px;padding:12px;resize:none;">${val}</textarea></div>`;
          } else {
            html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><input class="input" id="biz-f-${f.id}" type="${f.type}" placeholder="${f.placeholder}" value="${val.replace(/"/g, '&quot;')}"></div>`;
          }
        }
      });
    }
    html += `</div>`;
  });

  document.getElementById('biz-edit-form').innerHTML = html;
  nav('bizEdit');
}

function addBizAddressRow() {
  const list = document.getElementById('biz-addresses-list');
  if (!list) return;
  const count = list.querySelectorAll('.biz-addr-input').length;
  if (count >= 10) { showToast('Максимум 10 адресов'); return; }
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
  row.innerHTML = `
    <input type="text" class="input biz-addr-input" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
    <button type="button" onclick="this.parentElement.remove()" style="width:44px;height:44px;background:var(--bg);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;font-size:20px;color:var(--text-secondary);flex-shrink:0;">×</button>`;
  list.appendChild(row);
  row.querySelector('.biz-addr-input').focus();
}

function toggleBizCheck(label, fieldId) {
  const input = label.querySelector('input');
  input.checked = !input.checked;
  if (input.checked) {
    label.style.background = 'rgba(74,144,217,0.1)';
    label.style.borderColor = 'var(--primary)';
  } else {
    label.style.background = 'var(--bg)';
    label.style.borderColor = 'var(--border)';
  }
}

async function saveBizEdit() {
  if (!currentBiz || !supabaseClient) return;
  const cfg = BIZ_FIELDS[currentBiz.type];
  if (!cfg) return;

  // Собираем адреса из динамических полей
  const addrInputs = document.querySelectorAll('.biz-addr-input');
  const addresses = Array.from(addrInputs).map(i => i.value.trim()).filter(Boolean);

  // Собираем все значения из формы
  const formData = {};
  cfg.sections.forEach(sec => {
    if (sec.type === 'checkboxes') {
      const container = document.getElementById('biz-edit-checks-' + sec.id);
      if (container) {
        const checkedInputs = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
        const formServices = checkedInputs.map(i => {
          const name = i.value;
          const priceInput = container.querySelector(`.svc-price-input[data-svc="${name}"]`);
          const price = priceInput ? priceInput.value.trim() : '';
          return price ? { name, price } : name;
        });
        // Сохраняем категории услуг (trainer, grooming и т.д.) которые были добавлены 
        // через быстрые кнопки — они не входят в чекбоксы формы
        const checkboxOptions = sec.options || [];
        const existingCategories = (currentBiz[sec.id] || []).filter(v => {
          const name = typeof v === 'string' ? v : v.name;
          return !checkboxOptions.includes(name);
        });
        formData[sec.id] = [...existingCategories, ...formServices];
      }
    } else {
      sec.fields.forEach(f => {
        if (f.id === 'address') {
          // Берём первый адрес для основного поля
          formData[f.id] = addresses[0] || '';
        } else {
          const el = document.getElementById('biz-f-' + f.id);
          if (el) formData[f.id] = el.value.trim();
        }
      });
    }
  });

  // Валидация обязательных
  const allFields = cfg.sections.flatMap(s => s.fields || []);
  for (const f of allFields) {
    if (f.required && f.id === 'address' && !addresses.length) {
      showToast('❌ Укажите хотя бы один адрес');
      return;
    } else if (f.required && f.id !== 'address' && !formData[f.id]) {
      showToast('❌ Заполните: ' + f.label);
      return;
    }
  }

  // Колонки которые точно есть в таблице businesses
  const KNOWN_COLUMNS = [
    'name', 'description', 'address', 'phone', 'phone2', 'email', 'website',
    'price_from', 'services', 'telegram', 'instagram',
    'area', 'schedule', 'experience', 'education', 'dog_breeds', 'lesson_format',
    'doctors', 'equipment', 'emergency', 'dog_policy', 'max_dog_size', 'dog_menu',
    'cover_url'
  ];

  // Разделяем поля: известные идут прямо, остальные игнорируем
  const dbUpdate = {};

  Object.entries(formData).forEach(([key, val]) => {
    if (KNOWN_COLUMNS.includes(key)) {
      dbUpdate[key] = val;
    }
  });

  console.log('Saving biz, dbUpdate keys:', Object.keys(dbUpdate));

  try {
    let updatePayload = { ...dbUpdate, updated_at: new Date().toISOString() };

    let { error } = await supabaseClient
      .from('businesses')
      .update(updatePayload)
      .eq('id', currentBiz.id);

    if (error) throw error;

    // Загружаем обложку если была выбрана
    if (_businessCoverFile) {
      const coverUrl = await uploadBusinessCover(currentBiz.id);
      if (coverUrl) currentBiz.cover_url = coverUrl;
    }

    // Сохраняем адреса в business_locations
    if (addresses.length > 0) {
      // Удаляем старые и вставляем новые
      await supabaseClient.from('business_locations').delete().eq('business_id', currentBiz.id);

      // Сохраняем адреса сразу без геокодинга чтобы не тормозить
      const locRows = addresses.map((addr, i) => ({
        business_id: currentBiz.id, address: addr, is_main: i === 0, location_lat: null, location_lng: null
      }));
      await supabaseClient.from('business_locations').insert(locRows);

      // Геокодинг в фоне — не блокируем сохранение
      (async () => {
        try {
          for (let i = 0; i < addresses.length; i++) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 5000);
              const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(addresses[i]) + '&limit=1', { signal: controller.signal });
              clearTimeout(timer);
              const d = await r.json();
              if (d && d[0]) {
                const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
                await supabaseClient.from('business_locations').update({ location_lat: lat, location_lng: lng }).eq('business_id', currentBiz.id).eq('address', addresses[i]);
                if (i === 0) {
                  await supabaseClient.from('businesses').update({ location_lat: lat, location_lng: lng }).eq('id', currentBiz.id);
                }
              }
            } catch(e) { /* geocoding failed, skip */ }
          }
        } catch(e) {}
      })();
    }

    // Обновляем локальный объект
    Object.assign(currentBiz, formData);

    // Обновляем в массиве userBusinesses
    const idx = userBusinesses.findIndex(b => b.id === currentBiz.id);
    if (idx !== -1) userBusinesses[idx] = { ...currentBiz };

    showToast('✅ Изменения сохранены!', '#7ED321');
    back();
    setTimeout(() => renderBizDashboard(currentBiz), 300);
  } catch(e) {
    console.error('Save biz final error:', e);
    showToast('❌ ' + (e.message || 'Ошибка сохранения'));
  }
}

// checkUserBusiness вызывается из патча nav() в app.js

// ════════════════════════════════════════════════════════════
// SHOP PRODUCTS — Управление товарами для магазинов
// ════════════════════════════════════════════════════════════

let _shopProducts = [];
let _editingProductId = null;

// Показываем раздел товаров только для магазинов
function renderBizDashboardShop(biz) {
  if (biz.type !== 'shop') return '';
  return `
    <div style="margin-top:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:800;">🛍️ Товары</div>
        <button onclick="openAddProduct()" class="btn btn-sm btn-p" style="height:36px;padding:0 14px;font-size:13px;border-radius:12px;">+ Добавить</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button onclick="openImportModal()" class="btn btn-sm btn-g" style="height:36px;padding:0 14px;font-size:13px;border-radius:12px;">📥 Импорт товаров</button>
      </div>
      <div id="biz-products-list"></div>
    </div>`;
}

async function loadBizProducts(businessId) {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient
      .from('shop_products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    _shopProducts = data || [];
    renderBizProducts();
  } catch(e) { console.error('loadBizProducts:', e); }
}

function renderBizProducts() {
  const el = document.getElementById('biz-products-list');
  if (!el) return;
  if (!_shopProducts.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;background:var(--bg);border-radius:14px;">Товаров пока нет.<br>Нажмите «+ Добавить» чтобы добавить первый.</div>';
    return;
  }
  el.innerHTML = _shopProducts.map(p => {
    const img = (p.images && p.images[0]) ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '<div style="font-size:20px;display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg);border-radius:10px;">🛍️</div>';
    return `
      <div style="background:var(--white);border-radius:14px;padding:12px;box-shadow:var(--shadow);margin-bottom:8px;display:flex;gap:10px;align-items:center;">
        <div style="width:48px;height:48px;flex-shrink:0;">${img}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
          <div style="font-size:13px;color:var(--primary);font-weight:700;">${p.price.toLocaleString('ru')} ₽</div>
          <div style="font-size:11px;color:${p.in_stock ? '#34C759' : '#FF3B30'};font-weight:600;">${p.in_stock ? '✓ В наличии' : '✗ Нет в наличии'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button onclick="openEditProduct('${p.id}')" style="background:var(--bg);border:none;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--primary);">Ред.</button>
          <button onclick="deleteProduct('${p.id}')" style="background:rgba(255,59,48,0.08);border:none;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;color:#FF3B30;">Удал.</button>
        </div>
      </div>`;
  }).join('');
}

function openAddProduct() {
  _editingProductId = null;
  showProductModal();
}

function openEditProduct(productId) {
  _editingProductId = productId;
  const p = _shopProducts.find(x => x.id === productId);
  if (!p) return;
  showProductModal(p);
}

// Хранилище фото для текущего товара
let _productPhotoFiles = []; // File объекты
let _productPhotoUrls = [];  // уже загруженные URL

function showProductModal(product = null) {
  const isEdit = !!product;
  _productPhotoFiles = [];
  _productPhotoUrls = product?.images ? [...product.images] : [];

  const CATS = [
    {id:'food', label:'🍖 Корма'},
    {id:'accessories', label:'🦮 Аксессуары'},
    {id:'toys', label:'🎾 Игрушки'},
    {id:'clothing', label:'🧥 Одежда'},
    {id:'health', label:'💊 Здоровье'},
    {id:'other', label:'📦 Другое'},
  ];

  const catOptions = CATS.map(c =>
    `<option value="${c.id.split(' ')[0]}" ${product?.category === c.id.split(' ')[0] ? 'selected' : ''}>${c.label}</option>`
  ).join('');

  // Существующие характеристики
  const existingAttrs = product?.attributes ? Object.entries(product.attributes) : [];

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;backdrop-filter:blur(6px);';
  modal.innerHTML = `
    <div style="background:var(--white);border-radius:24px 24px 0 0;width:100%;max-height:92vh;overflow-y:auto;padding:20px 16px;">
      <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 18px;"></div>
      <div style="font-size:18px;font-weight:900;margin-bottom:20px;">${isEdit ? 'Редактировать товар' : 'Новый товар'}</div>

      <!-- ФОТО -->
      <div style="margin-bottom:18px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">Фотографии товара (до 5 штук)</div>
        <div id="pf-photos-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"></div>
        <label style="display:flex;align-items:center;gap:8px;background:var(--bg);border:1.5px dashed var(--border);border-radius:14px;padding:12px 16px;cursor:pointer;font-size:14px;font-weight:600;color:var(--primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Добавить фото
          <input type="file" id="pf-photo-input" accept="image/*" multiple style="display:none;" onchange="handleProductPhotos(this)">
        </label>
      </div>

      <!-- НАЗВАНИЕ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Название *</div>
        <input id="pf-name" class="input" value="${product?.name || ''}" placeholder="Например: Ошейник кожаный, размер M">
      </div>

      <!-- ЦЕНА -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Цена ₽ *</div>
          <input id="pf-price" class="input" type="number" value="${product?.price || ''}" placeholder="1 500">
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Старая цена ₽</div>
          <input id="pf-old-price" class="input" type="number" value="${product?.old_price || ''}" placeholder="2 000">
        </div>
      </div>

      <!-- КАТЕГОРИЯ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Категория *</div>
        <select id="pf-category" class="input" style="appearance:none;">${catOptions}</select>
      </div>

      <!-- ОПИСАНИЕ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Описание товара</div>
        <textarea id="pf-description" class="input" style="min-height:80px;resize:none;" placeholder="Расскажите о товаре — состав, особенности, для кого подходит...">${product?.description || ''}</textarea>
      </div>

      <!-- ХАРАКТЕРИСТИКИ -->
      <div style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);">Характеристики</div>
          <button onclick="addAttrRow()" style="background:none;border:none;color:var(--primary);font-size:13px;font-weight:700;cursor:pointer;padding:4px 8px;">+ Добавить</button>
        </div>
        <div id="pf-attrs-list" style="display:flex;flex-direction:column;gap:8px;">
          ${existingAttrs.map(([k,v], i) => `
            <div style="display:flex;gap:8px;align-items:center;" id="attr-row-${i}">
              <input class="input pf-attr-key" value="${k}" placeholder="Параметр (напр. Вес)" style="flex:1;margin-bottom:0;">
              <input class="input pf-attr-val" value="${v}" placeholder="Значение (напр. 2 кг)" style="flex:1;margin-bottom:0;">
              <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;">×</button>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">Например: Вес → 2 кг, Порода → Мелкие, Возраст → Взрослые</div>
      </div>

      <!-- НАЛИЧИЕ -->
      <div style="margin-bottom:20px;background:var(--bg);border-radius:14px;padding:14px;">
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
          <div>
            <div style="font-size:14px;font-weight:700;">Товар в наличии</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Покупатели смогут его заказать</div>
          </div>
          <input type="checkbox" id="pf-in-stock" ${(!product || product.in_stock) ? 'checked' : ''} style="width:22px;height:22px;">
        </label>
      </div>

      <!-- КНОПКИ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-bottom:env(safe-area-inset-bottom,0px);">
        <button onclick="closeProductModal()" style="height:52px;background:var(--bg);border:none;border-radius:16px;font-size:15px;font-weight:700;cursor:pointer;">Отмена</button>
        <button onclick="saveProduct()" id="pf-save-btn" style="height:52px;background:var(--primary);color:white;border:none;border-radius:16px;font-size:15px;font-weight:700;cursor:pointer;">Сохранить</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeProductModal(); });
  renderProductPhotosRow();
}

function renderProductPhotosRow() {
  const row = document.getElementById('pf-photos-row');
  if (!row) return;
  const all = [..._productPhotoUrls.map(u => ({type:'url', src:u})), ..._productPhotoFiles.map(f => ({type:'file', src:URL.createObjectURL(f), file:f}))];
  if (!all.length) { row.innerHTML = ''; return; }
  row.innerHTML = all.map((item, i) => `
    <div style="position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;flex-shrink:0;">
      <img src="${item.src}" style="width:100%;height:100%;object-fit:cover;">
      <button onclick="removeProductPhoto(${i},'${item.type}')" style="position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(0,0,0,0.6);border:none;border-radius:50%;color:white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
    </div>`).join('');
}

function removeProductPhoto(index, type) {
  const urlCount = _productPhotoUrls.length;
  if (index < urlCount) {
    _productPhotoUrls.splice(index, 1);
  } else {
    _productPhotoFiles.splice(index - urlCount, 1);
  }
  renderProductPhotosRow();
}

function handleProductPhotos(input) {
  const files = Array.from(input.files);
  const total = _productPhotoUrls.length + _productPhotoFiles.length + files.length;
  if (total > 5) {
    showToast('Максимум 5 фотографий');
    const allowed = 5 - _productPhotoUrls.length - _productPhotoFiles.length;
    _productPhotoFiles.push(...files.slice(0, allowed));
  } else {
    _productPhotoFiles.push(...files);
  }
  input.value = '';
  renderProductPhotosRow();
}

function addAttrRow() {
  const list = document.getElementById('pf-attrs-list');
  if (!list) return;
  const id = 'attr-row-' + Date.now();
  const row = document.createElement('div');
  row.id = id;
  row.style.cssText = 'display:flex;gap:8px;align-items:center;';
  row.innerHTML = `
    <input class="input pf-attr-key" placeholder="Параметр" style="flex:1;margin-bottom:0;">
    <input class="input pf-attr-val" placeholder="Значение" style="flex:1;margin-bottom:0;">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;">×</button>`;
  list.appendChild(row);
  row.querySelector('.pf-attr-key').focus();
}

function closeProductModal() {
  const m = document.getElementById('product-modal');
  if (m) m.remove();
  _productPhotoFiles = [];
  _productPhotoUrls = [];
}

async function uploadProductPhotos(businessId, productId) {
  const uploaded = [..._productPhotoUrls];
  for (const file of _productPhotoFiles) {
    try {
      const ext = file.name.split('.').pop();
      const path = `products/${businessId}/${productId}/${Date.now()}.${ext}`;
      const { error } = await supabaseClient.storage.from('products').upload(path, file, { upsert: true });
      if (!error) {
        const { data: pub } = supabaseClient.storage.from('products').getPublicUrl(path);
        if (pub?.publicUrl) uploaded.push(pub.publicUrl);
      }
    } catch(e) { console.error('upload photo error:', e); }
  }
  return uploaded;
}

async function saveProduct() {
  if (!supabaseClient || !currentBiz) return;
  const name = document.getElementById('pf-name')?.value.trim();
  const price = parseInt(document.getElementById('pf-price')?.value);
  const oldPrice = parseInt(document.getElementById('pf-old-price')?.value) || null;
  const category = document.getElementById('pf-category')?.value;
  const description = document.getElementById('pf-description')?.value.trim();
  const inStock = document.getElementById('pf-in-stock')?.checked;

  if (!name) { showToast('❌ Укажите название товара'); return; }
  if (!price || price <= 0) { showToast('❌ Укажите цену'); return; }
  if (!category) { showToast('❌ Выберите категорию'); return; }

  // Собираем характеристики из строк ключ-значение
  const attrKeys = document.querySelectorAll('.pf-attr-key');
  const attrVals = document.querySelectorAll('.pf-attr-val');
  let attributes = null;
  if (attrKeys.length) {
    const obj = {};
    attrKeys.forEach((k, i) => {
      const key = k.value.trim();
      const val = attrVals[i]?.value.trim();
      if (key && val) obj[key] = val;
    });
    if (Object.keys(obj).length) attributes = obj;
  }

  const saveBtn = document.getElementById('pf-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем...'; }

  try {
    let productId = _editingProductId;

    // Сначала создаём/обновляем товар без фото
    const payload = { name, price, old_price: oldPrice, category, description: description || null, attributes, in_stock: inStock, business_id: currentBiz.id, images: _productPhotoUrls };

    if (productId) {
      await supabaseClient.from('shop_products').update(payload).eq('id', productId);
    } else {
      const { data, error } = await supabaseClient.from('shop_products').insert(payload).select().single();
      if (error) throw error;
      productId = data.id;
    }

    // Загружаем новые фото и обновляем images
    if (_productPhotoFiles.length > 0) {
      const allImages = await uploadProductPhotos(currentBiz.id, productId);
      await supabaseClient.from('shop_products').update({ images: allImages }).eq('id', productId);
    }

    showToast('✅ Товар сохранён', '#34C759');
    closeProductModal();
    await loadBizProducts(currentBiz.id);
  } catch(e) {
    console.error('saveProduct:', e);
    showToast('❌ ' + (e.message || 'Ошибка сохранения'));
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
  }
}

async function deleteProduct(productId) {
  if (!confirm('Удалить товар?')) return;
  try {
    await supabaseClient.from('shop_products').delete().eq('id', productId);
    showToast('Удалено');
    await loadBizProducts(currentBiz.id);
  } catch(e) { showToast('❌ Ошибка'); }
}


// ══════════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ КАТЕГОРИЯМИ УСЛУГ
// ══════════════════════════════════════════════════════════════

async function toggleServiceCategory(categoryId) {
  if (!currentBiz) return;
  
  try {
    // Получаем текущие услуги (может быть микс строк и объектов)
    let services = currentBiz.services || [];
    
    // Проверяем есть ли уже такая услуга
    const existingIdx = services.findIndex(s => (typeof s === 'string' ? s : s.name) === categoryId);
    
    if (existingIdx >= 0) {
      // Убираем
      services = services.filter((_, i) => i !== existingIdx);
    } else {
      // Добавляем как строку (цену можно будет указать в редактировании)
      services.push(categoryId);
    }
    
    // Сохраняем в БД
    const { error } = await supabaseClient
      .from('businesses')
      .update({ services: services })
      .eq('id', currentBiz.id);
    
    if (error) throw error;
    
    // Обновляем локальный объект
    currentBiz.services = services;
    
    // Обновляем UI
    const isSelected = existingIdx < 0;
    const elem = document.getElementById(`service-cat-${categoryId}`);
    if (elem) {
      elem.style.borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
      elem.style.background = isSelected ? 'rgba(74,144,217,0.1)' : 'var(--bg)';
      elem.style.color = isSelected ? 'var(--primary)' : 'var(--text-secondary)';
      elem.innerHTML = `
        <span>${BIZ_SERVICE_CATEGORIES.find(c => c.id === categoryId)?.icon}</span>
        <span>${BIZ_SERVICE_CATEGORIES.find(c => c.id === categoryId)?.label}</span>
        ${isSelected ? '<span style="font-size:12px;">✓</span>' : ''}
      `;
    }
    
    showToast(isSelected ? '✅ Услуга добавлена' : 'Услуга убрана', isSelected ? '#34C759' : '#8E8E93');
    
  } catch(e) {
    console.error('toggleServiceCategory error:', e);
    showToast('❌ Ошибка сохранения');
  }
}

window.toggleServiceCategory = toggleServiceCategory;

// ════════════════════════════════════════════════════════════
// PRODUCT IMPORT — CSV / YML feed
// ════════════════════════════════════════════════════════════

function openImportModal() {
  const modal = document.createElement('div');
  modal.id = 'import-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;backdrop-filter:blur(6px);';
  modal.innerHTML = `
    <div style="background:var(--white);border-radius:24px 24px 0 0;width:100%;max-height:92vh;overflow-y:auto;padding:20px 16px;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));">
      <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 18px;"></div>
      <div style="font-size:18px;font-weight:900;margin-bottom:4px;">📥 Импорт товаров</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Загрузите CSV-файл или вставьте ссылку на YML-фид</div>

      <!-- TABS -->
      <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border);">
        <button id="imp-tab-csv" onclick="switchImportTab('csv')" style="flex:1;background:none;border:none;padding:10px 0;font-size:14px;font-weight:700;color:var(--primary);border-bottom:2.5px solid var(--primary);margin-bottom:-2px;cursor:pointer;font-family:inherit;">📄 CSV-файл</button>
        <button id="imp-tab-yml" onclick="switchImportTab('yml')" style="flex:1;background:none;border:none;padding:10px 0;font-size:14px;font-weight:700;color:var(--text-secondary);border-bottom:2.5px solid transparent;margin-bottom:-2px;cursor:pointer;font-family:inherit;">🔗 YML-фид</button>
      </div>

      <!-- CSV -->
      <div id="imp-pane-csv">
        <div style="background:var(--bg);border-radius:14px;padding:14px;margin-bottom:12px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Формат CSV-файла:</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
            Первая строка — заголовки. Обязательные колонки: <b>name</b>, <b>price</b><br>
            Опционально: <b>description</b>, <b>category</b>, <b>old_price</b>, <b>image</b>, <b>in_stock</b><br>
            Категории: food, accessories, toys, clothing, health, other<br>
            Разделитель: запятая или точка с запятой
          </div>
        </div>
        <button onclick="downloadCsvTemplate()" class="btn btn-g" style="width:100%;margin-bottom:12px;height:44px;font-size:14px;border-radius:14px;">📋 Скачать шаблон CSV</button>
        <label style="display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--bg);border:2px dashed var(--border);border-radius:14px;padding:24px 16px;cursor:pointer;text-align:center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span style="font-size:14px;font-weight:700;color:var(--primary);">Выберите CSV-файл</span>
          <span style="font-size:12px;color:var(--text-secondary);" id="imp-csv-filename">Или перетащите сюда</span>
          <input type="file" accept=".csv,.txt,.tsv" style="display:none;" onchange="handleCsvFile(this)">
        </label>
        <div id="imp-csv-preview" style="margin-top:12px;"></div>
      </div>

      <!-- YML -->
      <div id="imp-pane-yml" style="display:none;">
        <div style="background:var(--bg);border-radius:14px;padding:14px;margin-bottom:12px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px;">YML-фид (Яндекс.Маркет):</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
            Вставьте ссылку на YML/XML файл из вашей CMS<br>
            Поддерживаются: 1С-Битрикс, InSales, WooCommerce, Tilda и другие
          </div>
        </div>
        <input id="imp-yml-url" type="url" placeholder="https://example.com/feed.yml" style="width:100%;height:48px;border:1.5px solid var(--border);border-radius:14px;padding:0 14px;font-size:14px;font-family:inherit;outline:none;background:var(--bg);margin-bottom:12px;box-sizing:border-box;">
        <button onclick="loadYmlFeed()" class="btn btn-p" style="width:100%;height:48px;font-size:14px;border-radius:14px;">🔍 Загрузить фид</button>
        <div id="imp-yml-preview" style="margin-top:12px;"></div>
      </div>

      <!-- ACTIONS -->
      <div id="imp-actions" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;" id="imp-count">0 товаров</div>
          <label style="font-size:13px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" id="imp-replace" style="width:16px;height:16px;">
            Заменить все товары
          </label>
        </div>
        <button onclick="executeImport()" id="imp-go-btn" class="btn btn-p" style="width:100%;height:52px;font-size:16px;border-radius:16px;">📥 Импортировать</button>
      </div>

      <button onclick="closeImportModal()" class="btn btn-g" style="width:100%;margin-top:12px;height:44px;font-size:14px;border-radius:14px;">Отмена</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeImportModal(); });
}

function closeImportModal() {
  const m = document.getElementById('import-modal');
  if (m) m.remove();
  _importParsed = [];
}

function switchImportTab(tab) {
  const csvPane = document.getElementById('imp-pane-csv');
  const ymlPane = document.getElementById('imp-pane-yml');
  const csvTab = document.getElementById('imp-tab-csv');
  const ymlTab = document.getElementById('imp-tab-yml');
  if (tab === 'csv') {
    csvPane.style.display = '';
    ymlPane.style.display = 'none';
    csvTab.style.color = 'var(--primary)'; csvTab.style.borderBottom = '2.5px solid var(--primary)';
    ymlTab.style.color = 'var(--text-secondary)'; ymlTab.style.borderBottom = '2.5px solid transparent';
  } else {
    csvPane.style.display = 'none';
    ymlPane.style.display = '';
    ymlTab.style.color = 'var(--primary)'; ymlTab.style.borderBottom = '2.5px solid var(--primary)';
    csvTab.style.color = 'var(--text-secondary)'; csvTab.style.borderBottom = '2.5px solid transparent';
  }
}

// ── CSV ──
let _importParsed = [];

function downloadCsvTemplate() {
  const header = 'name;price;old_price;category;description;image;in_stock';
  const row1 = 'Корм для собак Royal Canin;2500;;food;Сухой корм для средних пород;https://example.com/photo.jpg;true';
  const row2 = 'Поводок кожаный;1200;1500;accessories;Натуральная кожа, длина 1.5м;;true';
  const csv = header + '\n' + row1 + '\n' + row2;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dogly_products_template.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('Шаблон скачан');
}

function handleCsvFile(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('imp-csv-filename').textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    parseCsv(text);
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCsv(text) {
  // Определяем разделитель
  const firstLine = text.split('\n')[0];
  const sep = firstLine.includes(';') ? ';' : ',';

  const lines = text.trim().split('\n');
  if (lines.length < 2) { showToast('Файл пустой или только заголовки'); return; }

  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const nameIdx = headers.indexOf('name');
  const priceIdx = headers.indexOf('price');

  if (nameIdx === -1 || priceIdx === -1) {
    showToast('Нужны колонки name и price');
    return;
  }

  const descIdx = headers.indexOf('description');
  const catIdx = headers.indexOf('category');
  const oldPriceIdx = headers.indexOf('old_price');
  const imgIdx = headers.indexOf('image');
  const stockIdx = headers.indexOf('in_stock');

  _importParsed = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line, sep);
    const name = (cols[nameIdx] || '').trim();
    const price = parsePrice(cols[priceIdx]);
    if (!name || !price) continue;

    _importParsed.push({
      name,
      price,
      old_price: oldPriceIdx >= 0 ? (parsePrice(cols[oldPriceIdx]) || null) : null,
      category: catIdx >= 0 ? (cols[catIdx] || 'other').trim() : 'other',
      description: descIdx >= 0 ? (cols[descIdx] || '').trim() : '',
      images: imgIdx >= 0 && cols[imgIdx]?.trim() ? [cols[imgIdx].trim()] : [],
      in_stock: stockIdx >= 0 ? (cols[stockIdx] || '').trim().toLowerCase() !== 'false' : true,
    });
  }

  showImportPreview('imp-csv-preview');
}

// Парсинг CSV строки с учётом кавычек
// Умный парсинг цены: 1990.00, 1 990,50, 2,500, 3500
function parsePrice(str) {
  let s = (str || '0').trim().replace(/\s/g, '');
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  return Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) || 0);
}

function parseCsvLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === sep) { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

// ── YML ──
async function loadYmlFeed() {
  const url = document.getElementById('imp-yml-url')?.value.trim();
  if (!url) { showToast('Вставьте ссылку на фид'); return; }

  const preview = document.getElementById('imp-yml-preview');
  preview.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">⏳ Загружаем фид...</div>';

  try {
    // Пробуем загрузить через прокси (CORS)
    let text = '';
    const proxyUrls = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
      'https://corsproxy.io/?' + encodeURIComponent(url),
      url // fallback — прямой запрос
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (resp.ok) { text = await resp.text(); break; }
      } catch(e) { continue; }
    }

    if (!text) throw new Error('Не удалось загрузить фид');

    parseYml(text);
  } catch(e) {
    preview.innerHTML = `<div style="background:rgba(239,68,68,0.08);border-radius:12px;padding:14px;color:#EF4444;font-size:13px;">❌ ${e.message}<br><br><span style="color:var(--text-secondary);">Возможные причины: неверная ссылка, CORS-ограничения, или сервер не отвечает. Попробуйте скачать фид и загрузить как CSV.</span></div>`;
  }
}

function parseYml(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const offers = doc.querySelectorAll('offer');

    if (!offers.length) {
      showToast('В фиде нет товаров (offer)');
      document.getElementById('imp-yml-preview').innerHTML = '<div style="padding:12px;color:var(--text-secondary);font-size:13px;">Не найдено элементов &lt;offer&gt;. Проверьте формат фида.</div>';
      return;
    }

    _importParsed = [];
    const catMap = {};

    // Собираем категории
    doc.querySelectorAll('category').forEach(c => {
      catMap[c.getAttribute('id')] = c.textContent.trim();
    });

    offers.forEach(offer => {
      const name = (offer.querySelector('name')?.textContent || offer.querySelector('model')?.textContent || '').trim();
      const priceEl = offer.querySelector('price');
      const price = priceEl ? parsePrice(priceEl.textContent) : 0;
      if (!name || !price) return;

      const oldPriceEl = offer.querySelector('oldprice');
      const desc = offer.querySelector('description')?.textContent?.trim() || '';
      const catId = offer.querySelector('categoryId')?.textContent || '';
      const catName = (catMap[catId] || '').toLowerCase();

      // Маппинг YML-категорий на наши
      let category = 'other';
      if (/корм|еда|питан/i.test(catName)) category = 'food';
      else if (/аксесс|поводок|ошейник|миск/i.test(catName)) category = 'accessories';
      else if (/игруш/i.test(catName)) category = 'toys';
      else if (/одежд|костюм|комбинез/i.test(catName)) category = 'clothing';
      else if (/здоров|витамин|лекар|шампун/i.test(catName)) category = 'health';

      // Фото
      const images = [];
      offer.querySelectorAll('picture').forEach(pic => {
        const url = pic.textContent?.trim();
        if (url) images.push(url);
      });

      const available = offer.getAttribute('available');

      _importParsed.push({
        name,
        price,
        old_price: oldPriceEl ? (parsePrice(oldPriceEl.textContent) || null) : null,
        category,
        description: desc.substring(0, 500),
        images: images.slice(0, 5),
        in_stock: available !== 'false',
      });
    });

    showImportPreview('imp-yml-preview');
  } catch(e) {
    showToast('Ошибка парсинга XML');
    console.error('YML parse error:', e);
  }
}

// ── Preview & Execute ──
function showImportPreview(containerId) {
  const preview = document.getElementById(containerId);
  const actions = document.getElementById('imp-actions');

  if (!_importParsed.length) {
    preview.innerHTML = '<div style="padding:12px;color:var(--text-secondary);font-size:13px;">Не найдено товаров.</div>';
    if (actions) actions.style.display = 'none';
    return;
  }

  if (actions) actions.style.display = '';
  document.getElementById('imp-count').textContent = `${_importParsed.length} товаров найдено`;

  const cats = {};
  _importParsed.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  const catLabels = { food: '🍖 Корма', accessories: '🦮 Аксессуары', toys: '🎾 Игрушки', clothing: '🧥 Одежда', health: '💊 Здоровье', other: '📦 Другое' };

  preview.innerHTML = `
    <div style="background:var(--bg);border-radius:14px;padding:12px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Найдено: ${_importParsed.length} товаров</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        ${Object.entries(cats).map(([k, v]) => `<span style="background:var(--white);padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;">${catLabels[k] || k} (${v})</span>`).join('')}
      </div>
      <div style="font-size:12px;color:var(--text-secondary);">С фото: ${_importParsed.filter(p => p.images.length).length} · Без фото: ${_importParsed.filter(p => !p.images.length).length}</div>
    </div>
    <div style="max-height:200px;overflow-y:auto;">
      ${_importParsed.slice(0, 10).map(p => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--bg);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">
            ${p.images[0] ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='🛍️'">` : '🛍️'}
          </div>
          <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">${p.name}</div>
          <div style="font-weight:700;color:var(--primary);flex-shrink:0;">${p.price.toLocaleString('ru')} ₽</div>
        </div>`).join('')}
      ${_importParsed.length > 10 ? `<div style="text-align:center;padding:8px;font-size:12px;color:var(--text-secondary);">... и ещё ${_importParsed.length - 10}</div>` : ''}
    </div>`;
}

async function executeImport() {
  if (!_importParsed.length || !supabaseClient || !currentBiz) return;

  const replaceAll = document.getElementById('imp-replace')?.checked;
  const btn = document.getElementById('imp-go-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Импортируем...'; }

  try {
    // Удаляем старые если выбрано "заменить"
    if (replaceAll) {
      await supabaseClient.from('shop_products').delete().eq('business_id', currentBiz.id);
    }

    // Вставляем пачками по 50
    let imported = 0;
    for (let i = 0; i < _importParsed.length; i += 50) {
      const batch = _importParsed.slice(i, i + 50).map(p => ({
        business_id: currentBiz.id,
        name: p.name,
        price: p.price,
        old_price: p.old_price,
        category: p.category || 'other',
        description: p.description || null,
        images: p.images.length ? p.images : null,
        in_stock: p.in_stock !== false,
        is_active: true
      }));

      const { error } = await supabaseClient.from('shop_products').insert(batch);
      if (error) throw error;
      imported += batch.length;

      if (btn) btn.textContent = `⏳ ${imported} / ${_importParsed.length}...`;
    }

    showToast(`✅ Импортировано ${imported} товаров!`, '#34C759');
    closeImportModal();
    await loadBizProducts(currentBiz.id);
  } catch(e) {
    console.error('Import error:', e);
    showToast('❌ Ошибка: ' + (e.message || ''));
    if (btn) { btn.disabled = false; btn.textContent = '📥 Импортировать'; }
  }
}
