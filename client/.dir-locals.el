;;; Directory Local Variables            -*- no-byte-compile: t -*-
;;; For more information see (info "(emacs) Directory Variables")

((nil . ((eval . (progn
                   (setq-local exec-path
                               (copy-sequence exec-path))
                   (add-to-list 'exec-path
                                (concat
                                 (locate-dominating-file default-directory ".dir-locals.el")
                                 "node_modules/.bin")))))))
