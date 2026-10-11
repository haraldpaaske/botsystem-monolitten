import { useEffect, useRef, useState } from "react";

export default function PlayerSelect({ id, label, players, value = "", onChange, required = false }) {
  const [search, setSearch] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const text = search === null ? value : search;
  const matches = players.filter((name) => name.toLocaleLowerCase("nb").includes(text.trim().toLocaleLowerCase("nb")));
  const listId = `${id}-options`;

  useEffect(() => {
    input.current.setCustomValidity(text && text !== value ? "Velg et navn fra listen." : "");
  }, [text, value]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, listId]);

  const choose = (name) => {
    onChange(name);
    setSearch(null);
    input.current.focus();
    setOpen(false);
    setActive(-1);
  };

  return <div className="player-select" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setActive(-1);
    }
  }}>
    <label htmlFor={id}>{label}</label>
    <input ref={input} id={id} type="text" role="combobox" value={text}
      placeholder="Søk etter navn …" autoComplete="off" autoCapitalize="words" spellCheck={false}
      required={required} aria-autocomplete="list" aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && active >= 0 && active < matches.length ? `${listId}-${active}` : undefined}
      onFocus={() => { setOpen(true); setActive(-1); }}
      onClick={() => setOpen(true)}
      onChange={(event) => {
        setSearch(event.target.value);
        if (value) onChange("");
        setOpen(true);
        setActive(-1);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActive((previous) => matches.length ? (event.key === "ArrowDown"
            ? (previous + 1) % matches.length
            : (previous <= 0 ? matches.length - 1 : previous - 1)) : -1);
        } else if (event.key === "Enter" && open) {
          event.preventDefault();
          if (active >= 0 && matches[active]) choose(matches[active]);
          else if (matches.length === 1) choose(matches[0]);
        } else if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        }
      }} />
    {open && <div className="player-select-dropdown">
      <ul id={listId} role="listbox" aria-label={label}>
        {matches.map((name, index) => <li key={name} role="presentation">
          <button type="button" role="option" id={`${listId}-${index}`} tabIndex={-1}
            aria-selected={active === index} onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(name)}>{name}</button>
        </li>)}
      </ul>
      {!matches.length && <p role="status">Ingen navn funnet</p>}
    </div>}
  </div>;
}
