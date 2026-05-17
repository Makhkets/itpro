package edms

import (
	"time"
)

// seed заполняет in-memory хранилище демонстрационными документами,
// шаблонами и маршрутами, чтобы фронтенд имел реалистичный вид без БД.
func (s *Store) seed() {
	now := time.Now()

	// --- Маршруты согласования ---
	routes := []*Route{
		{
			ID:          "route-academic-leave",
			Title:       "Академический отпуск",
			Description: "Согласование заявления студента на академический отпуск.",
			Steps: []RouteStep{
				{Order: 1, Role: "teacher", Title: "Куратор группы", SLAHours: 24},
				{Order: 2, Role: "head", Title: "Директор института", SLAHours: 48},
				{Order: 3, Role: "rector", Title: "Ректорат", SLAHours: 72},
			},
			UsageCount: 124,
			AvgHours:   58,
			UpdatedAt:  now.Add(-72 * time.Hour),
		},
		{
			ID:          "route-reference",
			Title:       "Справка об обучении",
			Description: "Быстрая выдача справки об обучении студенту.",
			Steps: []RouteStep{
				{Order: 1, Role: "head", Title: "Учебный отдел", SLAHours: 8},
				{Order: 2, Role: "head", Title: "Деканат", SLAHours: 8},
			},
			UsageCount: 412,
			AvgHours:   9,
			UpdatedAt:  now.Add(-24 * time.Hour),
		},
		{
			ID:          "route-business-trip",
			Title:       "Командировка преподавателя",
			Description: "Согласование служебной командировки преподавателя.",
			Steps: []RouteStep{
				{Order: 1, Role: "head", Title: "Зав. кафедрой", SLAHours: 24},
				{Order: 2, Role: "accountant", Title: "Бухгалтерия", SLAHours: 24},
				{Order: 3, Role: "rector", Title: "Ректорат", SLAHours: 24},
			},
			UsageCount: 88,
			AvgHours:   36,
			UpdatedAt:  now.Add(-120 * time.Hour),
		},
		{
			ID:          "route-admission",
			Title:       "Поступление: пакет документов",
			Description: "Приём документов абитуриента в приёмной комиссии.",
			Steps: []RouteStep{
				{Order: 1, Role: "admin", Title: "Приёмная комиссия", SLAHours: 48},
				{Order: 2, Role: "head", Title: "Директор института", SLAHours: 48},
			},
			UsageCount: 1820,
			AvgHours:   22,
			UpdatedAt:  now.Add(-12 * time.Hour),
		},
		{
			ID:          "route-order",
			Title:       "Приказ по университету",
			Description: "Согласование внутреннего приказа.",
			Steps: []RouteStep{
				{Order: 1, Role: "head", Title: "Управление делами", SLAHours: 24},
				{Order: 2, Role: "accountant", Title: "Бухгалтерия", SLAHours: 24},
				{Order: 3, Role: "rector", Title: "Ректор", SLAHours: 24},
			},
			UsageCount: 56,
			AvgHours:   42,
			UpdatedAt:  now.Add(-48 * time.Hour),
		},
	}
	for _, r := range routes {
		s.routes[r.ID] = r
	}

	// --- Шаблоны ---
	templates := []*Template{
		{
			ID:          "tpl-academic-leave",
			Code:        "STU-AL-01",
			Title:       "Заявление на академический отпуск",
			Category:    "academic",
			Description: "Заявление студента с обоснованием и сроками отпуска.",
			Icon:        "graduation",
			Roles:       []string{"student"},
			RouteID:     "route-academic-leave",
			Body:        "Прошу предоставить академический отпуск с {{startDate}} по {{endDate}} в связи с {{reason}}.",
			Fields: []TemplateField{
				{Key: "startDate", Label: "Дата начала", Type: "date", Required: true},
				{Key: "endDate", Label: "Дата окончания", Type: "date", Required: true},
				{Key: "reason", Label: "Причина", Type: "textarea", Required: true, Placeholder: "Семейные обстоятельства, медицинские показания…"},
			},
			Popularity: 124,
			UpdatedAt:  now.Add(-30 * 24 * time.Hour),
		},
		{
			ID:          "tpl-reference",
			Code:        "STU-REF-01",
			Title:       "Справка об обучении",
			Category:    "academic",
			Description: "Запрос справки для предоставления по месту требования.",
			Icon:        "file-text",
			Roles:       []string{"student", "teacher"},
			RouteID:     "route-reference",
			Body:        "Прошу выдать справку об обучении для предоставления в {{destination}}. Количество копий: {{copies}}.",
			Fields: []TemplateField{
				{Key: "destination", Label: "Куда (организация)", Type: "text", Required: true, Placeholder: "Военкомат, банк, посольство…"},
				{Key: "copies", Label: "Количество копий", Type: "number", Required: true},
				{Key: "language", Label: "Язык справки", Type: "select", Options: []string{"Русский", "English"}, Required: false},
			},
			Popularity: 412,
			UpdatedAt:  now.Add(-7 * 24 * time.Hour),
		},
		{
			ID:          "tpl-business-trip",
			Code:        "TCH-BT-01",
			Title:       "Заявление на командировку",
			Category:    "hr",
			Description: "Служебная командировка преподавателя для участия в конференции.",
			Icon:        "plane",
			Roles:       []string{"teacher"},
			RouteID:     "route-business-trip",
			Body:        "Прошу направить меня в командировку в г. {{city}} c {{from}} по {{to}}. Цель: {{purpose}}.",
			Fields: []TemplateField{
				{Key: "city", Label: "Город", Type: "text", Required: true},
				{Key: "from", Label: "Дата начала", Type: "date", Required: true},
				{Key: "to", Label: "Дата окончания", Type: "date", Required: true},
				{Key: "purpose", Label: "Цель командировки", Type: "textarea", Required: true},
			},
			Popularity: 88,
			UpdatedAt:  now.Add(-14 * 24 * time.Hour),
		},
		{
			ID:          "tpl-admission",
			Code:        "APP-AD-01",
			Title:       "Заявление о приёме на обучение",
			Category:    "admission",
			Description: "Заявление абитуриента с указанием направлений подготовки.",
			Icon:        "user-plus",
			Roles:       []string{"applicant"},
			RouteID:     "route-admission",
			Body:        "Прошу допустить меня к участию в конкурсе на направление «{{program}}» ({{form}}).",
			Fields: []TemplateField{
				{Key: "program", Label: "Направление подготовки", Type: "text", Required: true},
				{Key: "form", Label: "Форма обучения", Type: "select", Options: []string{"Очная", "Очно-заочная", "Заочная"}, Required: true},
				{Key: "budget", Label: "Финансирование", Type: "select", Options: []string{"Бюджет", "Платно"}, Required: true},
			},
			Popularity: 1820,
			UpdatedAt:  now.Add(-2 * 24 * time.Hour),
		},
		{
			ID:          "tpl-memo",
			Code:        "GEN-MEMO-01",
			Title:       "Служебная записка",
			Category:    "general",
			Description: "Универсальная служебная записка для внутренних коммуникаций.",
			Icon:        "clipboard",
			Roles:       []string{"teacher", "admin"},
			RouteID:     "route-order",
			Body:        "Довожу до Вашего сведения: {{message}}.",
			Fields: []TemplateField{
				{Key: "subject", Label: "Тема", Type: "text", Required: true},
				{Key: "message", Label: "Содержание", Type: "textarea", Required: true},
			},
			Popularity: 64,
			UpdatedAt:  now.Add(-60 * 24 * time.Hour),
		},
		{
			ID:          "tpl-order",
			Code:        "ADM-ORD-01",
			Title:       "Приказ по университету",
			Category:    "legal",
			Description: "Шаблон приказа: общая часть + основания + пункты.",
			Icon:        "scale",
			Roles:       []string{"admin"},
			RouteID:     "route-order",
			Body:        "ПРИКАЗЫВАЮ:\n1. {{point1}}\n2. {{point2}}\nОснование: {{basis}}.",
			Fields: []TemplateField{
				{Key: "subject", Label: "Тема приказа", Type: "text", Required: true},
				{Key: "point1", Label: "Пункт 1", Type: "textarea", Required: true},
				{Key: "point2", Label: "Пункт 2", Type: "textarea"},
				{Key: "basis", Label: "Основание", Type: "text", Required: true},
			},
			Popularity: 56,
			UpdatedAt:  now.Add(-3 * 24 * time.Hour),
		},
	}
	for _, t := range templates {
		s.templates[t.ID] = t
	}

	// --- Демо-документы ---
	demoActors := []Party{
		{ID: "demo-student-1", FullName: "Магомедов Ислам Х.", Role: "student", Position: "Студент ПИ-21", Email: "i.magomedov@gstou.ru"},
		{ID: "demo-student-2", FullName: "Курбанова Зарема А.", Role: "student", Position: "Студентка ЭК-19", Email: "z.kurbanova@gstou.ru"},
		{ID: "demo-teacher-1", FullName: "Алиев Руслан М., к.т.н.", Role: "teacher", Position: "Доцент каф. ПИ", Email: "r.aliev@gstou.ru"},
		{ID: "demo-applicant-1", FullName: "Хасанов Адам Б.", Role: "applicant", Position: "Абитуриент", Email: "a.khasanov@mail.ru"},
		{ID: "demo-admin-1", FullName: "Управление делами", Role: "admin", Position: "Канцелярия", Email: "office@gstou.ru"},
	}
	dean := Party{ID: "demo-dean", FullName: "Деканат ИЦТ", Role: "head", Position: "Директор института"}
	rector := Party{ID: "demo-rector", FullName: "Ректорат", Role: "rector", Position: "Ректор"}
	accountant := Party{ID: "demo-accountant", FullName: "Бухгалтерия", Role: "accountant", Position: "Главный бухгалтер"}
	priem := Party{ID: "demo-priem", FullName: "Приёмная комиссия", Role: "admin", Position: "Секретарь"}

	s.regSeq = 142

	addDoc := func(d *Document) {
		s.regSeq++
		d.RegNumber = formatRegNumber(s.regSeq, d.CreatedAt.Year())
		if d.Attachments == nil {
			d.Attachments = []Attachment{}
		}
		if d.Signatures == nil {
			d.Signatures = []Signature{}
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		if d.Fields == nil {
			d.Fields = map[string]string{}
		}
		s.docs[d.ID] = d
	}

	// 1) Студент — академический отпуск (на согласовании, шаг 2: директор института)
	addDoc(&Document{
		ID:          "doc-1",
		Title:       "Заявление на академический отпуск",
		Type:        "statement",
		Category:    "academic",
		Direction:   DirectionOutgoing,
		Status:      StatusOnReview,
		Priority:    PriorityNormal,
		Description: "Прошу академический отпуск по семейным обстоятельствам сроком на 1 семестр.",
		Body:        "Прошу предоставить академический отпуск с 01.06.2026 по 30.11.2026 в связи с семейными обстоятельствами.",
		Author:      demoActors[0],
		Department:  "Институт цифровых технологий",
		TemplateID:  "tpl-academic-leave",
		RouteID:     "route-academic-leave",
		Tags:        []string{"студент", "академ"},
		Attachments: []Attachment{
			{ID: "att-1", Name: "Справка из больницы.pdf", Size: 184320, MimeType: "application/pdf", URL: "#", Uploaded: now.Add(-48 * time.Hour)},
		},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-1-1", Order: 1, Approver: Party{ID: "demo-curator", FullName: "Алиев Руслан М.", Role: "teacher", Position: "Куратор группы"}, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-36 * time.Hour)), Comment: "Согласен. Студент сообщил заранее."},
			{ID: "s-1-2", Order: 2, Approver: dean, Status: "pending", SLAHours: 48, IsCurrent: true},
			{ID: "s-1-3", Order: 3, Approver: rector, Status: "pending", SLAHours: 72},
		},
		Timeline: []TimelineEvent{
			{ID: "t-1-1", Type: "created", Actor: demoActors[0], Message: "Документ создан из шаблона", CreatedAt: now.Add(-72 * time.Hour)},
			{ID: "t-1-2", Type: "submitted", Actor: demoActors[0], Message: "Документ направлен на согласование", CreatedAt: now.Add(-72 * time.Hour)},
			{ID: "t-1-3", Type: "step_approved", Actor: Party{FullName: "Алиев Р. М.", Role: "teacher"}, Message: "Шаг «Куратор группы» — согласовано", CreatedAt: now.Add(-36 * time.Hour)},
		},
		Fields:    map[string]string{"startDate": "2026-06-01", "endDate": "2026-11-30", "reason": "Семейные обстоятельства"},
		CreatedAt: now.Add(-72 * time.Hour),
		UpdatedAt: now.Add(-36 * time.Hour),
		DueAt:     ptrTime(now.Add(72 * time.Hour)),
	})

	// 2) Студент — справка об обучении (подписана)
	addDoc(&Document{
		ID:          "doc-2",
		Title:       "Справка об обучении №REF-882",
		Type:        "reference",
		Category:    "academic",
		Direction:   DirectionIncoming,
		Status:      StatusSigned,
		Priority:    PriorityNormal,
		Description: "Справка об обучении для предоставления в военкомат.",
		Author:      demoActors[1],
		Recipient:   &Party{FullName: "Военкомат Ленинского района", Role: "external"},
		Department:  "Институт цифровой экономики",
		TemplateID:  "tpl-reference",
		RouteID:     "route-reference",
		Tags:        []string{"справка", "военкомат"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-2-1", Order: 1, Approver: Party{FullName: "Учебный отдел", Role: "head"}, Status: "approved", SLAHours: 8, ActedAt: ptrTime(now.Add(-22 * time.Hour))},
			{ID: "s-2-2", Order: 2, Approver: dean, Status: "signed", SLAHours: 8, ActedAt: ptrTime(now.Add(-2 * time.Hour))},
		},
		Signatures: []Signature{
			{ID: "sg-2-1", Signer: dean, Method: "enhanced_qualified", Algorithm: "GOST R 34.10-2012", Thumbprint: "9F4C7A1B0DDE51F4A2B3C6D7E8F901234567890A", SignedAt: now.Add(-2 * time.Hour), Valid: true},
		},
		Timeline: []TimelineEvent{
			{ID: "t-2-1", Type: "created", Actor: demoActors[1], Message: "Документ создан", CreatedAt: now.Add(-30 * time.Hour)},
			{ID: "t-2-2", Type: "step_approved", Actor: Party{FullName: "Учебный отдел"}, Message: "Учебный отдел согласовал", CreatedAt: now.Add(-22 * time.Hour)},
			{ID: "t-2-3", Type: "signed", Actor: dean, Message: "Документ подписан УКЭП", CreatedAt: now.Add(-2 * time.Hour)},
		},
		Fields:    map[string]string{"destination": "Военкомат Ленинского района", "copies": "2", "language": "Русский"},
		CreatedAt: now.Add(-30 * time.Hour),
		UpdatedAt: now.Add(-2 * time.Hour),
		SignedAt:  ptrTime(now.Add(-2 * time.Hour)),
	})

	// 3) Преподаватель — командировка (черновик)
	addDoc(&Document{
		ID:          "doc-3",
		Title:       "Командировка в Москву на конференцию IT-Edu 2026",
		Type:        "application",
		Category:    "hr",
		Direction:   DirectionOutgoing,
		Status:      StatusDraft,
		Priority:    PriorityHigh,
		Description: "Участие с докладом «Прикладной AI в инженерном образовании».",
		Body:        "Прошу направить меня в командировку в г. Москва c 12.06.2026 по 15.06.2026. Цель: участие в конференции IT-Edu 2026 с докладом.",
		Author:      demoActors[2],
		Department:  "Кафедра ПИ",
		TemplateID:  "tpl-business-trip",
		RouteID:     "route-business-trip",
		Tags:        []string{"командировка", "конференция"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-3-1", Order: 1, Approver: Party{FullName: "Зав. кафедрой ПИ", Role: "head"}, Status: "pending", SLAHours: 24},
			{ID: "s-3-2", Order: 2, Approver: accountant, Status: "pending", SLAHours: 24},
			{ID: "s-3-3", Order: 3, Approver: rector, Status: "pending", SLAHours: 24},
		},
		Timeline: []TimelineEvent{
			{ID: "t-3-1", Type: "created", Actor: demoActors[2], Message: "Документ создан из шаблона", CreatedAt: now.Add(-4 * time.Hour)},
		},
		Fields:    map[string]string{"city": "Москва", "from": "2026-06-12", "to": "2026-06-15", "purpose": "Конференция IT-Edu 2026"},
		CreatedAt: now.Add(-4 * time.Hour),
		UpdatedAt: now.Add(-4 * time.Hour),
	})

	// 4) Абитуриент — заявление о приёме (на рассмотрении, шаг 1)
	addDoc(&Document{
		ID:          "doc-4",
		Title:       "Заявление о приёме на обучение — 09.03.04",
		Type:        "application",
		Category:    "admission",
		Direction:   DirectionIncoming,
		Status:      StatusOnReview,
		Priority:    PriorityNormal,
		Description: "Подача документов на направление «Программная инженерия».",
		Body:        "Прошу допустить меня к участию в конкурсе на направление «09.03.04 Программная инженерия» (Очная). Финансирование: Бюджет.",
		Author:      demoActors[3],
		Department:  "Приёмная комиссия",
		TemplateID:  "tpl-admission",
		RouteID:     "route-admission",
		Tags:        []string{"абитуриент", "приём"},
		Attachments: []Attachment{
			{ID: "att-4-1", Name: "Аттестат.pdf", Size: 312540, MimeType: "application/pdf", URL: "#", Uploaded: now.Add(-26 * time.Hour)},
			{ID: "att-4-2", Name: "Паспорт_страница2.jpg", Size: 982130, MimeType: "image/jpeg", URL: "#", Uploaded: now.Add(-26 * time.Hour)},
			{ID: "att-4-3", Name: "СНИЛС.pdf", Size: 88130, MimeType: "application/pdf", URL: "#", Uploaded: now.Add(-26 * time.Hour)},
		},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-4-1", Order: 1, Approver: priem, Status: "pending", SLAHours: 48, IsCurrent: true},
			{ID: "s-4-2", Order: 2, Approver: dean, Status: "pending", SLAHours: 48},
		},
		Timeline: []TimelineEvent{
			{ID: "t-4-1", Type: "created", Actor: demoActors[3], Message: "Подача через личный кабинет абитуриента", CreatedAt: now.Add(-26 * time.Hour)},
			{ID: "t-4-2", Type: "submitted", Actor: demoActors[3], Message: "Документ направлен в приёмную комиссию", CreatedAt: now.Add(-26 * time.Hour)},
		},
		Fields:    map[string]string{"program": "09.03.04 Программная инженерия", "form": "Очная", "budget": "Бюджет"},
		CreatedAt: now.Add(-26 * time.Hour),
		UpdatedAt: now.Add(-26 * time.Hour),
		DueAt:     ptrTime(now.Add(96 * time.Hour)),
	})

	// 5) Админ — приказ (согласован)
	addDoc(&Document{
		ID:          "doc-5",
		Title:       "Приказ «Об утверждении расписания летней сессии 2026»",
		Type:        "order",
		Category:    "legal",
		Direction:   DirectionInternal,
		Status:      StatusApproved,
		Priority:    PriorityHigh,
		Description: "Утверждение графика проведения летней зачётно-экзаменационной сессии.",
		Author:      demoActors[4],
		Department:  "Учебно-методическое управление",
		TemplateID:  "tpl-order",
		RouteID:     "route-order",
		Tags:        []string{"приказ", "сессия"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-5-1", Order: 1, Approver: Party{FullName: "Управление делами", Role: "head"}, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-50 * time.Hour))},
			{ID: "s-5-2", Order: 2, Approver: accountant, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-26 * time.Hour))},
			{ID: "s-5-3", Order: 3, Approver: rector, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-3 * time.Hour))},
		},
		Timeline: []TimelineEvent{
			{ID: "t-5-1", Type: "created", Actor: demoActors[4], Message: "Документ создан", CreatedAt: now.Add(-72 * time.Hour)},
			{ID: "t-5-2", Type: "step_approved", Actor: Party{FullName: "Управление делами"}, Message: "Согласовано", CreatedAt: now.Add(-50 * time.Hour)},
			{ID: "t-5-3", Type: "step_approved", Actor: Party{FullName: "Бухгалтерия"}, Message: "Согласовано", CreatedAt: now.Add(-26 * time.Hour)},
			{ID: "t-5-4", Type: "step_approved", Actor: rector, Message: "Согласовано ректором", CreatedAt: now.Add(-3 * time.Hour)},
		},
		CreatedAt: now.Add(-72 * time.Hour),
		UpdatedAt: now.Add(-3 * time.Hour),
	})

	// 6) Просрочка
	addDoc(&Document{
		ID:          "doc-6",
		Title:       "Служебная записка о ремонте лаборатории Л-204",
		Type:        "memo",
		Category:    "general",
		Direction:   DirectionInternal,
		Status:      StatusOnReview,
		Priority:    PriorityCritical,
		Description: "Срочное обращение по неисправному оборудованию.",
		Author:      demoActors[2],
		Department:  "Кафедра ПИ",
		TemplateID:  "tpl-memo",
		RouteID:     "route-order",
		Tags:        []string{"срочно", "АХЧ"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-6-1", Order: 1, Approver: Party{FullName: "Управление делами", Role: "head"}, Status: "pending", SLAHours: 24, IsCurrent: true},
			{ID: "s-6-2", Order: 2, Approver: accountant, Status: "pending", SLAHours: 24},
			{ID: "s-6-3", Order: 3, Approver: rector, Status: "pending", SLAHours: 24},
		},
		Timeline: []TimelineEvent{
			{ID: "t-6-1", Type: "created", Actor: demoActors[2], Message: "Документ создан", CreatedAt: now.Add(-96 * time.Hour)},
			{ID: "t-6-2", Type: "submitted", Actor: demoActors[2], Message: "Направлен в управление делами", CreatedAt: now.Add(-96 * time.Hour)},
		},
		CreatedAt: now.Add(-96 * time.Hour),
		UpdatedAt: now.Add(-96 * time.Hour),
		DueAt:     ptrTime(now.Add(-12 * time.Hour)),
	})

	// 7) Архивный
	addDoc(&Document{
		ID:          "doc-7",
		Title:       "Договор о практической подготовке студентов",
		Type:        "contract",
		Category:    "legal",
		Direction:   DirectionOutgoing,
		Status:      StatusArchived,
		Priority:    PriorityNormal,
		Description: "Соглашение с ООО «Цифровые решения» о прохождении практики.",
		Author:      demoActors[4],
		Department:  "Управление делами",
		Tags:        []string{"договор", "практика"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-7-1", Order: 1, Approver: dean, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-40 * 24 * time.Hour))},
			{ID: "s-7-2", Order: 2, Approver: rector, Status: "signed", SLAHours: 24, ActedAt: ptrTime(now.Add(-38 * 24 * time.Hour))},
		},
		Signatures: []Signature{
			{ID: "sg-7-1", Signer: rector, Method: "enhanced_qualified", Algorithm: "GOST R 34.10-2012", Thumbprint: "11AABBCC22DDEE33FF4455667788990011AABBCC", SignedAt: now.Add(-38 * 24 * time.Hour), Valid: true},
		},
		CreatedAt:  now.Add(-44 * 24 * time.Hour),
		UpdatedAt:  now.Add(-38 * 24 * time.Hour),
		SignedAt:   ptrTime(now.Add(-38 * 24 * time.Hour)),
		ArchivedAt: ptrTime(now.Add(-30 * 24 * time.Hour)),
	})

	// 8) Студент — отклонённый
	addDoc(&Document{
		ID:          "doc-8",
		Title:       "Заявление на пересдачу — Дискретная математика",
		Type:        "statement",
		Category:    "academic",
		Direction:   DirectionOutgoing,
		Status:      StatusRejected,
		Priority:    PriorityNormal,
		Author:      demoActors[0],
		Department:  "Институт цифровых технологий",
		Description: "Запрос пересдачи экзамена с обоснованием.",
		Tags:        []string{"пересдача"},
		ApprovalRoute: []ApprovalStep{
			{ID: "s-8-1", Order: 1, Approver: Party{FullName: "Куратор группы", Role: "teacher"}, Status: "approved", SLAHours: 24, ActedAt: ptrTime(now.Add(-8 * 24 * time.Hour))},
			{ID: "s-8-2", Order: 2, Approver: dean, Status: "rejected", SLAHours: 48, ActedAt: ptrTime(now.Add(-6 * 24 * time.Hour)), Comment: "Срок подачи пропущен. Подать в следующую сессию."},
		},
		Timeline: []TimelineEvent{
			{ID: "t-8-1", Type: "created", Actor: demoActors[0], Message: "Документ создан", CreatedAt: now.Add(-10 * 24 * time.Hour)},
			{ID: "t-8-2", Type: "step_rejected", Actor: dean, Message: "Деканат: срок подачи пропущен", CreatedAt: now.Add(-6 * 24 * time.Hour)},
		},
		CreatedAt: now.Add(-10 * 24 * time.Hour),
		UpdatedAt: now.Add(-6 * 24 * time.Hour),
	})
}

func ptrTime(t time.Time) *time.Time { return &t }

func formatRegNumber(seq, year int) string {
	return formatNumber("ЭДО-", year, seq)
}

func formatNumber(prefix string, year, seq int) string {
	return prefix + itoa(year) + "/" + pad(seq, 4)
}

func itoa(v int) string {
	return fmtInt(int64(v))
}

func fmtInt(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	buf := [20]byte{}
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

func pad(v, width int) string {
	s := itoa(v)
	for len(s) < width {
		s = "0" + s
	}
	return s
}
