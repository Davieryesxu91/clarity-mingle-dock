;; MingleDock - Professional Meetup Organization Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-capacity-reached (err u103))
(define-constant err-not-registered (err u104))

;; Data Variables
(define-map events 
    { event-id: uint }
    {
        organizer: principal,
        title: (string-ascii 50),
        description: (string-ascii 500),
        date: uint,
        capacity: uint,
        current-registrations: uint,
        active: bool
    }
)

(define-map registrations
    { event-id: uint, attendee: principal }
    { registered: bool, checked-in: bool }
)

(define-map reputation
    { user: principal }
    { events-organized: uint, events-attended: uint }
)

(define-data-var event-counter uint u0)

;; Private Functions
(define-private (increment-counter)
    (let ((current (var-get event-counter)))
        (var-set event-counter (+ current u1))
        (var-get event-counter)
    )
)

;; Public Functions
(define-public (create-event (title (string-ascii 50)) 
                           (description (string-ascii 500))
                           (date uint)
                           (capacity uint))
    (let ((event-id (increment-counter)))
        (map-insert events
            { event-id: event-id }
            {
                organizer: tx-sender,
                title: title,
                description: description,
                date: date,
                capacity: capacity,
                current-registrations: u0,
                active: true
            }
        )
        (ok event-id)
    )
)

(define-public (register-for-event (event-id uint))
    (let ((event (unwrap! (map-get? events { event-id: event-id }) err-not-found))
          (current-registrations (get current-registrations event)))
        (asserts! (< current-registrations (get capacity event)) err-capacity-reached)
        (map-insert registrations 
            { event-id: event-id, attendee: tx-sender }
            { registered: true, checked-in: false }
        )
        (map-set events
            { event-id: event-id }
            (merge event { current-registrations: (+ current-registrations u1) })
        )
        (ok true)
    )
)

(define-public (check-in (event-id uint) (attendee principal))
    (let ((event (unwrap! (map-get? events { event-id: event-id }) err-not-found))
          (registration (unwrap! (map-get? registrations { event-id: event-id, attendee: attendee }) err-not-registered)))
        (asserts! (is-eq tx-sender (get organizer event)) err-owner-only)
        (map-set registrations
            { event-id: event-id, attendee: attendee }
            { registered: true, checked-in: true }
        )
        (ok true)
    )
)

;; Read Only Functions
(define-read-only (get-event (event-id uint))
    (map-get? events { event-id: event-id })
)

(define-read-only (get-registration-status (event-id uint) (attendee principal))
    (map-get? registrations { event-id: event-id, attendee: attendee })
)

(define-read-only (get-reputation (user principal))
    (default-to 
        { events-organized: u0, events-attended: u0 }
        (map-get? reputation { user: user })
    )
)