package edms

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/smartcampus/smartcampus-api/internal/middleware"
	"github.com/smartcampus/smartcampus-api/internal/response"
)

// HTTPHandler регистрирует REST-маршруты ЭДО в существующей protected-группе.
type HTTPHandler struct {
	store *Store
}

func NewHTTPHandler(store *Store) *HTTPHandler {
	return &HTTPHandler{store: store}
}

// Register подключает ЭДО ко всем уже аутентифицированным маршрутам:
//
//	GET    /edms/documents
//	POST   /edms/documents
//	GET    /edms/documents/:id
//	PATCH  /edms/documents/:id
//	POST   /edms/documents/:id/submit
//	POST   /edms/documents/:id/approve
//	POST   /edms/documents/:id/reject
//	POST   /edms/documents/:id/sign
//	POST   /edms/documents/:id/comment
//	POST   /edms/documents/:id/attachments
//	POST   /edms/documents/:id/archive
//	POST   /edms/documents/:id/cancel
//	GET    /edms/templates
//	GET    /edms/templates/:id
//	GET    /edms/routes
//	GET    /edms/routes/:id
//	GET    /edms/analytics
func (h *HTTPHandler) Register(protected *gin.RouterGroup) {
	g := protected.Group("/edms")
	g.GET("/documents", h.list)
	g.POST("/documents", h.create)
	g.GET("/documents/:id", h.get)
	g.PATCH("/documents/:id", h.update)
	g.POST("/documents/:id/submit", h.submit)
	g.POST("/documents/:id/approve", h.approve)
	g.POST("/documents/:id/reject", h.reject)
	g.POST("/documents/:id/sign", h.sign)
	g.POST("/documents/:id/comment", h.comment)
	g.POST("/documents/:id/attachments", h.attach)
	g.POST("/documents/:id/archive", h.archive)
	g.POST("/documents/:id/cancel", h.cancel)

	g.GET("/templates", h.listTemplates)
	g.GET("/templates/:id", h.getTemplate)

	g.GET("/routes", h.listRoutes)
	g.GET("/routes/:id", h.getRoute)

	g.GET("/analytics", h.analytics)
}

// ----- helpers -----

func (h *HTTPHandler) actor(c *gin.Context) Actor {
	return Actor{
		UserID:    c.GetString(middleware.ContextUserID),
		Email:     c.GetString(middleware.ContextEmail),
		Role:      c.GetString(middleware.ContextRole),
		FullName:  c.GetString("full_name"),
		GroupName: c.GetString(middleware.ContextGroupName),
	}
}

func toErr(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return response.NotFound("Документ не найден")
	case errors.Is(err, ErrForbidden):
		return response.Forbidden("Недостаточно прав на действие с документом")
	case errors.Is(err, ErrConflict):
		return response.Conflict(err.Error())
	case errors.Is(err, ErrInvalid):
		return response.Validation(err.Error(), nil)
	}
	return response.Internal("Внутренняя ошибка ЭДО")
}

func atoi(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}

// ----- handlers -----

func (h *HTTPHandler) list(c *gin.Context) {
	f := ListFilter{
		Status:    strings.TrimSpace(c.Query("status")),
		Type:      strings.TrimSpace(c.Query("type")),
		Category:  strings.TrimSpace(c.Query("category")),
		Direction: strings.TrimSpace(c.Query("direction")),
		Priority:  strings.TrimSpace(c.Query("priority")),
		AuthorID:  strings.TrimSpace(c.Query("authorId")),
		Tag:       strings.TrimSpace(c.Query("tag")),
		Query:     strings.TrimSpace(c.Query("q")),
		Mine:      c.Query("mine") == "true",
		Inbox:     c.Query("inbox") == "true",
		Page:      atoi(c.Query("page"), 1),
		PageSize:  atoi(c.Query("pageSize"), 20),
	}
	res := h.store.ListDocuments(h.actor(c), f)
	response.OK(c, res)
}

func (h *HTTPHandler) get(c *gin.Context) {
	doc, err := h.store.GetDocument(c.Param("id"), h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) create(c *gin.Context) {
	var in CreateDocumentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.WriteError(c, response.Validation("Invalid request body", gin.H{"error": err.Error()}))
		return
	}
	doc, err := h.store.CreateDocument(in, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	c.JSON(http.StatusCreated, doc)
}

func (h *HTTPHandler) update(c *gin.Context) {
	var in UpdateDocumentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.WriteError(c, response.Validation("Invalid request body", gin.H{"error": err.Error()}))
		return
	}
	doc, err := h.store.UpdateDocument(c.Param("id"), in, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) submit(c *gin.Context) {
	doc, err := h.store.Submit(c.Param("id"), h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) approve(c *gin.Context) {
	var body struct {
		Comment string `json:"comment"`
	}
	_ = c.ShouldBindJSON(&body)
	doc, err := h.store.Approve(c.Param("id"), body.Comment, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) reject(c *gin.Context) {
	var body struct {
		Comment string `json:"comment"`
	}
	_ = c.ShouldBindJSON(&body)
	doc, err := h.store.Reject(c.Param("id"), body.Comment, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) sign(c *gin.Context) {
	var in SignInput
	_ = c.ShouldBindJSON(&in)
	doc, err := h.store.Sign(c.Param("id"), in, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) comment(c *gin.Context) {
	var in CommentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.WriteError(c, response.Validation("Invalid request body", nil))
		return
	}
	doc, err := h.store.Comment(c.Param("id"), in, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) attach(c *gin.Context) {
	var in AttachInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.WriteError(c, response.Validation("Invalid request body", nil))
		return
	}
	doc, err := h.store.Attach(c.Param("id"), in, h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) archive(c *gin.Context) {
	doc, err := h.store.Archive(c.Param("id"), h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) cancel(c *gin.Context) {
	doc, err := h.store.Cancel(c.Param("id"), h.actor(c))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, doc)
}

func (h *HTTPHandler) listTemplates(c *gin.Context) {
	response.OK(c, h.store.ListTemplates())
}

func (h *HTTPHandler) getTemplate(c *gin.Context) {
	t, err := h.store.GetTemplate(c.Param("id"))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, t)
}

func (h *HTTPHandler) listRoutes(c *gin.Context) {
	response.OK(c, h.store.ListRoutes())
}

func (h *HTTPHandler) getRoute(c *gin.Context) {
	r, err := h.store.GetRoute(c.Param("id"))
	if err != nil {
		response.WriteError(c, toErr(err))
		return
	}
	response.OK(c, r)
}

func (h *HTTPHandler) analytics(c *gin.Context) {
	response.OK(c, h.store.Analytics(h.actor(c)))
}
