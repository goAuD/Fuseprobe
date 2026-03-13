import { LocaleProvider } from "./features/i18n/locale";
import WorkbenchPage from "./features/workbench/WorkbenchPage";

export default function App() {
  return (
    <LocaleProvider>
      <WorkbenchPage />
    </LocaleProvider>
  );
}
