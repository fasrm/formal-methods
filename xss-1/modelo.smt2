; Tipos de conteúdo do parágrafo.
(declare-datatypes ()
  ((No
    (Vazio)
    (Texto (conteudo String))
    (Elemento (tag String))
  ))
)

; Estado anterior e entrada quaisquer.
(declare-const antes No)
(declare-const nome String)

; Modelo da substituição por textContent.
(define-fun atualizar ((anterior No) (entrada String)) No
  (Texto (str.++ "Olá, " entrada "!"))
)

(define-fun depois () No
  (atualizar antes nome)
)

(define-fun quantidadeElementos ((n No)) Int
  (ite ((_ is Elemento) n) 1 0)
)

; 1. As definições são consistentes?
(check-sat)

; 2. Existe alguma violação da propriedade?
(assert
  (or
    (not ((_ is Texto) depois))
    (> (quantidadeElementos depois) 0)
    (not (= (conteudo depois)
            (str.++ "Olá, " nome "!")))
  )
)

(check-sat)