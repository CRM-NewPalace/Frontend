import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HeaderSearchContextValue = {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const HeaderSearchContext = createContext<HeaderSearchContextValue | null>(
  null,
);

export function HeaderSearchProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState("Buscar...");
  const [enabled, setEnabled] = useState(false);
  const api = useMemo(
    () => ({
      value,
      setValue,
      placeholder,
      setPlaceholder,
      enabled,
      setEnabled,
    }),
    [value, placeholder, enabled],
  );
  return (
    <HeaderSearchContext.Provider value={api}>
      {children}
    </HeaderSearchContext.Provider>
  );
}

function useHeaderSearchContext() {
  const ctx = useContext(HeaderSearchContext);
  if (!ctx) {
    throw new Error("HeaderSearchProvider ausente.");
  }
  return ctx;
}

export function useHeaderSearchInput() {
  return useHeaderSearchContext();
}

/** Conecta a barra do header à página atual e limpa ao sair. */
export function useHeaderSearch(placeholder = "Buscar...") {
  const { value, setValue, setPlaceholder, setEnabled } =
    useHeaderSearchContext();

  useEffect(() => {
    setPlaceholder(placeholder);
    setEnabled(true);
    return () => {
      setEnabled(false);
      setValue("");
      setPlaceholder("Buscar...");
    };
  }, [placeholder, setPlaceholder, setEnabled, setValue]);

  return { value, setValue };
}
