# history
shopt -s histappend
export HISTFILESIZE=-1
export HISTSIZE=-1
export HISTTIMEFORMAT='%FT%T%z'
export HISTCONTROL=ignorespace
export HISTFILE="/h/${HOST_HOME:?}/.bash_history"

if [[ "$PROMPT_COMMAND" =~ \;\ *$ ]]; then
   export PROMPT_COMMAND="${PROMPT_COMMAND:-:} history -a"
else
   export PROMPT_COMMAND="${PROMPT_COMMAND:-:} ; history -a"
fi
export PROMPT_COMMAND="${PROMPT_COMMAND:-:} ; { "'echo "#$(date +%s)" ; echo "$(hostname) ${PWD}"; } >> "${MY_LOCATION_FILE:-"/h/${HOST_HOME:?}/.bash_location"}"'

export LANG=C.UTF-8
export TERM=xterm-256color
export LESSCHARSET=utf-8

if [[ $(uname) != Darwin ]] && which gsettings &> /dev/null; then
   gsettings set org.gnome.desktop.interface gtk-key-theme Emacs || :
fi

# keep home directory tidy
export INPUTRC="$HOME/dotfile/.inputrc"
export TIGRC_USER="$HOME/dotfile/.tigrc"

shopt -s autocd
shopt -s globstar
shopt -s dirspell
shopt -s cdspell
shopt -s extglob
shopt -s cmdhist
set -o noclobber

# AWS CLI
export SAM_CLI_TELEMETRY=0
complete -C aws_completer aws

if [[ -r "${HOMEBREW_PREFIX}/etc/profile.d/bash_completion.sh" ]]; then
  source "${HOMEBREW_PREFIX}/etc/profile.d/bash_completion.sh"
else
  for COMPLETION in "${HOMEBREW_PREFIX}/etc/bash_completion.d/"*
  do
    [[ -r "${COMPLETION}" ]] && source "${COMPLETION}"
  done
fi

export PATH="${HOME}"/.local/bin:"${PATH}"

# hunspell
export DICTIONARY=en_US

########## Sources
f="/usr/share/git-core/contrib/completion/git-prompt.sh" && [[ -f "$f" ]] && source "$f"

if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    source /usr/share/bash-completion/bash_completion
  elif [ -f /usr/local/etc/bash_completion ]; then
    source /usr/local/etc/bash_completion
  elif [ -f /etc/bash_completion ]; then
    source /etc/bash_completion
  fi
fi

# Prompts
export PROMPT_DIRTRIM=2
if [[ -n "$(type -t __git_ps1)" ]]; then
    export PS1="\h:\w\$(__git_ps1)\$ "
else
    export PS1="\h:\w\$ "
fi

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# mkdir and cd
mc(){
    mkdir -p "$1"
    cd "$1"
}

mcfnm(){
   cd "$(mfnm "$1")"
}

cde(){
   local d="$("${MY_EMACSCLIENT:-emacsclient}" -e "
(expand-file-name
 (with-current-buffer
     (window-buffer (get-mru-window))
   default-directory))
" | sed -e 's/^"\(.*\)"$/\1/g')"
   if [[ -z "$d" ]]; then
      :
   else
      pushd "$d"
   fi
}

########## alias
alias rm='\rm -i'
alias cp='\cp -ia'
alias scp='\scp -rp'
alias mv='\mv -i'
alias ls='\ls --color=auto'
alias l='\ls -FC --color=auto'
alias la='\ls -aFC --color=auto'
alias ll='\ls -alF --color=auto'
alias di='\git diff'
alias s='\git status --column'
alias grep='\grep --color=auto'

export MY_OPEN=xdg-open
alias pbcopy='\xclip -selection clipboard'
alias pbpaste='\xclip -selection clipboard -o'

alias j='julia'
alias m='\mkdir -p'
alias t='\touch'
alias less='\less -i -R'
alias le='\less -i -R'
alias tree='\tree -a'

alias g='\git'
alias gls='\git ls-files'
alias o="${MY_OPEN:-xdg-open}"
alias gg='git grep'

[[ $- == *i* ]] && \stty stop ''

# Python
export PYTHONDONTWRITEBYTECODE=1

if which direnv &> /dev/null ; then
   eval "$(direnv hook bash)"
fi

# Go
export PATH="$HOME"/go/bin:"$PATH"


# Xmodmap (should be put in .xinitrc)
f="$HOME"/dotfile/.xinitrc
[[ -r "$f" ]] && source "$f"

# Terraform
export CHECKPOINT_DISABLE=1
if which terraform > /dev/null ; then
   complete -C "$(which terraform)" terraform
fi

# Kubernetes
if which kubectl > /dev/null ; then
   source <(kubectl completion bash 2> /dev/null)
   alias k=kubectl
   complete -F __start_kubectl k
fi

if which kind > /dev/null ; then
   source <(kind completion bash)
fi

if which minikube > /dev/null ; then
   source <(minikube completion bash)
fi

# Rust
PATH="${RUSTUP_HOME:-"${HOME}/.rustup"}/bin:${CARGO_HOME:-"${$HOME}/.cargo"}/bin:${PATH}"
export PATH

if which rustup > /dev/null; then
   . <(rustup completions bash)
   . <(rustup completions bash cargo)
fi
