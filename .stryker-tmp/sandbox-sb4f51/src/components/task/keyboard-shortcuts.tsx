// @ts-nocheck
"use client";

function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { useState, useEffect } from "react";
import { HelpCircle, Search, Plus, X, Edit3, Shield, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface Shortcut {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "navigation" | "tasks" | "search";
  enabled: boolean;
  custom?: boolean;
  meta?: boolean;
  shift?: boolean;
}
interface ShortcutSettings {
  customShortcuts?: Record<string, string>;
  enableCustomShortcuts?: boolean;
}
interface KeyboardShortcutsProps {
  settings?: ShortcutSettings;
  onSaveSettings?: (settings: ShortcutSettings) => void;
}
const defaultShortcuts: Shortcut[] = stryMutAct_9fa48("110") ? [] : (stryCov_9fa48("110"), [// Navigation
stryMutAct_9fa48("111") ? {} : (stryCov_9fa48("111"), {
  id: stryMutAct_9fa48("112") ? "" : (stryCov_9fa48("112"), "new_task"),
  key: stryMutAct_9fa48("113") ? "" : (stryCov_9fa48("113"), "n"),
  label: stryMutAct_9fa48("114") ? "" : (stryCov_9fa48("114"), "New Task"),
  description: stryMutAct_9fa48("115") ? "" : (stryCov_9fa48("115"), "Create a new task"),
  category: stryMutAct_9fa48("116") ? "" : (stryCov_9fa48("116"), "navigation"),
  enabled: stryMutAct_9fa48("117") ? false : (stryCov_9fa48("117"), true)
}), stryMutAct_9fa48("118") ? {} : (stryCov_9fa48("118"), {
  id: stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), "search"),
  key: stryMutAct_9fa48("120") ? "" : (stryCov_9fa48("120"), "/"),
  label: stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), "Search"),
  description: stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), "Focus search bar"),
  category: stryMutAct_9fa48("123") ? "" : (stryCov_9fa48("123"), "navigation"),
  enabled: stryMutAct_9fa48("124") ? false : (stryCov_9fa48("124"), true)
}), stryMutAct_9fa48("125") ? {} : (stryCov_9fa48("125"), {
  id: stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), "clear"),
  key: stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), "esc"),
  label: stryMutAct_9fa48("128") ? "" : (stryCov_9fa48("128"), "Clear"),
  description: stryMutAct_9fa48("129") ? "" : (stryCov_9fa48("129"), "Clear search or filters"),
  category: stryMutAct_9fa48("130") ? "" : (stryCov_9fa48("130"), "navigation"),
  enabled: stryMutAct_9fa48("131") ? false : (stryCov_9fa48("131"), true)
}), stryMutAct_9fa48("132") ? {} : (stryCov_9fa48("132"), {
  id: stryMutAct_9fa48("133") ? "" : (stryCov_9fa48("133"), "view_today"),
  key: stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), "1"),
  label: stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), "Today"),
  description: stryMutAct_9fa48("136") ? "" : (stryCov_9fa48("136"), "Switch to Today view"),
  category: stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), "navigation"),
  enabled: stryMutAct_9fa48("138") ? false : (stryCov_9fa48("138"), true)
}), stryMutAct_9fa48("139") ? {} : (stryCov_9fa48("139"), {
  id: stryMutAct_9fa48("140") ? "" : (stryCov_9fa48("140"), "view_kanban"),
  key: stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), "2"),
  label: stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), "Kanban"),
  description: stryMutAct_9fa48("143") ? "" : (stryCov_9fa48("143"), "Switch to Kanban board"),
  category: stryMutAct_9fa48("144") ? "" : (stryCov_9fa48("144"), "navigation"),
  enabled: stryMutAct_9fa48("145") ? false : (stryCov_9fa48("145"), true)
}), stryMutAct_9fa48("146") ? {} : (stryCov_9fa48("146"), {
  id: stryMutAct_9fa48("147") ? "" : (stryCov_9fa48("147"), "view_analytics"),
  key: stryMutAct_9fa48("148") ? "" : (stryCov_9fa48("148"), "3"),
  label: stryMutAct_9fa48("149") ? "" : (stryCov_9fa48("149"), "Analytics"),
  description: stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), "Switch to Analytics view"),
  category: stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), "navigation"),
  enabled: stryMutAct_9fa48("152") ? false : (stryCov_9fa48("152"), true)
}), stryMutAct_9fa48("153") ? {} : (stryCov_9fa48("153"), {
  id: stryMutAct_9fa48("154") ? "" : (stryCov_9fa48("154"), "view_gantt"),
  key: stryMutAct_9fa48("155") ? "" : (stryCov_9fa48("155"), "g"),
  label: stryMutAct_9fa48("156") ? "" : (stryCov_9fa48("156"), "Gantt"),
  description: stryMutAct_9fa48("157") ? "" : (stryCov_9fa48("157"), "Switch to Gantt chart"),
  category: stryMutAct_9fa48("158") ? "" : (stryCov_9fa48("158"), "navigation"),
  enabled: stryMutAct_9fa48("159") ? false : (stryCov_9fa48("159"), true),
  shift: stryMutAct_9fa48("160") ? false : (stryCov_9fa48("160"), true)
}), stryMutAct_9fa48("161") ? {} : (stryCov_9fa48("161"), {
  id: stryMutAct_9fa48("162") ? "" : (stryCov_9fa48("162"), "view_matrix"),
  key: stryMutAct_9fa48("163") ? "" : (stryCov_9fa48("163"), "m"),
  label: stryMutAct_9fa48("164") ? "" : (stryCov_9fa48("164"), "Matrix"),
  description: stryMutAct_9fa48("165") ? "" : (stryCov_9fa48("165"), "Switch to Eisenhower Matrix"),
  category: stryMutAct_9fa48("166") ? "" : (stryCov_9fa48("166"), "navigation"),
  enabled: stryMutAct_9fa48("167") ? false : (stryCov_9fa48("167"), true),
  shift: stryMutAct_9fa48("168") ? false : (stryCov_9fa48("168"), true)
}), stryMutAct_9fa48("169") ? {} : (stryCov_9fa48("169"), {
  id: stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), "ai_assistant"),
  key: stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), "a"),
  label: stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), "AI Assistant"),
  description: stryMutAct_9fa48("173") ? "" : (stryCov_9fa48("173"), "Open AI Assistant"),
  category: stryMutAct_9fa48("174") ? "" : (stryCov_9fa48("174"), "navigation"),
  enabled: stryMutAct_9fa48("175") ? false : (stryCov_9fa48("175"), true),
  meta: stryMutAct_9fa48("176") ? false : (stryCov_9fa48("176"), true)
}), stryMutAct_9fa48("177") ? {} : (stryCov_9fa48("177"), {
  id: stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), "view_calendar"),
  key: stryMutAct_9fa48("179") ? "" : (stryCov_9fa48("179"), "c"),
  label: stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), "Calendar"),
  description: stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), "Switch to Calendar view"),
  category: stryMutAct_9fa48("182") ? "" : (stryCov_9fa48("182"), "navigation"),
  enabled: stryMutAct_9fa48("183") ? false : (stryCov_9fa48("183"), true)
}), stryMutAct_9fa48("184") ? {} : (stryCov_9fa48("184"), {
  id: stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), "show_shortcuts"),
  key: stryMutAct_9fa48("186") ? "" : (stryCov_9fa48("186"), "k"),
  label: stryMutAct_9fa48("187") ? "" : (stryCov_9fa48("187"), "Shortcuts"),
  description: stryMutAct_9fa48("188") ? "" : (stryCov_9fa48("188"), "Show keyboard shortcuts"),
  category: stryMutAct_9fa48("189") ? "" : (stryCov_9fa48("189"), "navigation"),
  enabled: stryMutAct_9fa48("190") ? false : (stryCov_9fa48("190"), true),
  meta: stryMutAct_9fa48("191") ? false : (stryCov_9fa48("191"), true)
}), // Tasks
stryMutAct_9fa48("192") ? {} : (stryCov_9fa48("192"), {
  id: stryMutAct_9fa48("193") ? "" : (stryCov_9fa48("193"), "toggle_complete"),
  key: stryMutAct_9fa48("194") ? "" : (stryCov_9fa48("194"), "space"),
  label: stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), "Toggle"),
  description: stryMutAct_9fa48("196") ? "" : (stryCov_9fa48("196"), "Mark task as complete/incomplete"),
  category: stryMutAct_9fa48("197") ? "" : (stryCov_9fa48("197"), "tasks"),
  enabled: stryMutAct_9fa48("198") ? false : (stryCov_9fa48("198"), true)
}), stryMutAct_9fa48("199") ? {} : (stryCov_9fa48("199"), {
  id: stryMutAct_9fa48("200") ? "" : (stryCov_9fa48("200"), "edit_task"),
  key: stryMutAct_9fa48("201") ? "" : (stryCov_9fa48("201"), "e"),
  label: stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), "Edit"),
  description: stryMutAct_9fa48("203") ? "" : (stryCov_9fa48("203"), "Edit selected task"),
  category: stryMutAct_9fa48("204") ? "" : (stryCov_9fa48("204"), "tasks"),
  enabled: stryMutAct_9fa48("205") ? false : (stryCov_9fa48("205"), true)
}), stryMutAct_9fa48("206") ? {} : (stryCov_9fa48("206"), {
  id: stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), "delete_task"),
  key: stryMutAct_9fa48("208") ? "" : (stryCov_9fa48("208"), "delete"),
  label: stryMutAct_9fa48("209") ? "" : (stryCov_9fa48("209"), "Delete"),
  description: stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), "Delete selected task"),
  category: stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), "tasks"),
  enabled: stryMutAct_9fa48("212") ? false : (stryCov_9fa48("212"), true)
}), stryMutAct_9fa48("213") ? {} : (stryCov_9fa48("213"), {
  id: stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), "navigate_tasks"),
  key: stryMutAct_9fa48("215") ? "" : (stryCov_9fa48("215"), "arrow"),
  label: stryMutAct_9fa48("216") ? "" : (stryCov_9fa48("216"), "Navigate"),
  description: stryMutAct_9fa48("217") ? "" : (stryCov_9fa48("217"), "Move between tasks"),
  category: stryMutAct_9fa48("218") ? "" : (stryCov_9fa48("218"), "tasks"),
  enabled: stryMutAct_9fa48("219") ? false : (stryCov_9fa48("219"), true)
}), stryMutAct_9fa48("220") ? {} : (stryCov_9fa48("220"), {
  id: stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), "focus_mode"),
  key: stryMutAct_9fa48("222") ? "" : (stryCov_9fa48("222"), "f"),
  label: stryMutAct_9fa48("223") ? "" : (stryCov_9fa48("223"), "Focus"),
  description: stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), "Enter focus mode"),
  category: stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), "tasks"),
  enabled: stryMutAct_9fa48("226") ? false : (stryCov_9fa48("226"), true),
  shift: stryMutAct_9fa48("227") ? false : (stryCov_9fa48("227"), true)
}), stryMutAct_9fa48("228") ? {} : (stryCov_9fa48("228"), {
  id: stryMutAct_9fa48("229") ? "" : (stryCov_9fa48("229"), "assign_task"),
  key: stryMutAct_9fa48("230") ? "" : (stryCov_9fa48("230"), "a"),
  label: stryMutAct_9fa48("231") ? "" : (stryCov_9fa48("231"), "Assign"),
  description: stryMutAct_9fa48("232") ? "" : (stryCov_9fa48("232"), "Open assignment tab"),
  category: stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), "tasks"),
  enabled: stryMutAct_9fa48("234") ? false : (stryCov_9fa48("234"), true),
  shift: stryMutAct_9fa48("235") ? false : (stryCov_9fa48("235"), true)
}), stryMutAct_9fa48("236") ? {} : (stryCov_9fa48("236"), {
  id: stryMutAct_9fa48("237") ? "" : (stryCov_9fa48("237"), "time_track"),
  key: stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), "t"),
  label: stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), "Time"),
  description: stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "Open time tracking tab"),
  category: stryMutAct_9fa48("241") ? "" : (stryCov_9fa48("241"), "tasks"),
  enabled: stryMutAct_9fa48("242") ? false : (stryCov_9fa48("242"), true),
  shift: stryMutAct_9fa48("243") ? false : (stryCov_9fa48("243"), true)
}), stryMutAct_9fa48("244") ? {} : (stryCov_9fa48("244"), {
  id: stryMutAct_9fa48("245") ? "" : (stryCov_9fa48("245"), "add_comment"),
  key: stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), "c"),
  label: stryMutAct_9fa48("247") ? "" : (stryCov_9fa48("247"), "Comments"),
  description: stryMutAct_9fa48("248") ? "" : (stryCov_9fa48("248"), "Open comments tab"),
  category: stryMutAct_9fa48("249") ? "" : (stryCov_9fa48("249"), "tasks"),
  enabled: stryMutAct_9fa48("250") ? false : (stryCov_9fa48("250"), true),
  shift: stryMutAct_9fa48("251") ? false : (stryCov_9fa48("251"), true)
}), stryMutAct_9fa48("252") ? {} : (stryCov_9fa48("252"), {
  id: stryMutAct_9fa48("253") ? "" : (stryCov_9fa48("253"), "add_attachment"),
  key: stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), "f"),
  label: stryMutAct_9fa48("255") ? "" : (stryCov_9fa48("255"), "Files"),
  description: stryMutAct_9fa48("256") ? "" : (stryCov_9fa48("256"), "Open attachments tab"),
  category: stryMutAct_9fa48("257") ? "" : (stryCov_9fa48("257"), "tasks"),
  enabled: stryMutAct_9fa48("258") ? false : (stryCov_9fa48("258"), true),
  shift: stryMutAct_9fa48("259") ? false : (stryCov_9fa48("259"), true)
}), // Search
stryMutAct_9fa48("260") ? {} : (stryCov_9fa48("260"), {
  id: stryMutAct_9fa48("261") ? "" : (stryCov_9fa48("261"), "settings"),
  key: stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), ","),
  label: stryMutAct_9fa48("263") ? "" : (stryCov_9fa48("263"), "Settings"),
  description: stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), "Open settings"),
  category: stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), "search"),
  enabled: stryMutAct_9fa48("266") ? false : (stryCov_9fa48("266"), true),
  meta: stryMutAct_9fa48("267") ? false : (stryCov_9fa48("267"), true)
})]);
const availableKeys = stryMutAct_9fa48("268") ? [] : (stryCov_9fa48("268"), [stryMutAct_9fa48("269") ? "" : (stryCov_9fa48("269"), "a"), stryMutAct_9fa48("270") ? "" : (stryCov_9fa48("270"), "b"), stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), "c"), stryMutAct_9fa48("272") ? "" : (stryCov_9fa48("272"), "d"), stryMutAct_9fa48("273") ? "" : (stryCov_9fa48("273"), "e"), stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), "f"), stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), "g"), stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), "h"), stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), "i"), stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), "j"), stryMutAct_9fa48("279") ? "" : (stryCov_9fa48("279"), "k"), stryMutAct_9fa48("280") ? "" : (stryCov_9fa48("280"), "l"), stryMutAct_9fa48("281") ? "" : (stryCov_9fa48("281"), "m"), stryMutAct_9fa48("282") ? "" : (stryCov_9fa48("282"), "n"), stryMutAct_9fa48("283") ? "" : (stryCov_9fa48("283"), "o"), stryMutAct_9fa48("284") ? "" : (stryCov_9fa48("284"), "p"), stryMutAct_9fa48("285") ? "" : (stryCov_9fa48("285"), "q"), stryMutAct_9fa48("286") ? "" : (stryCov_9fa48("286"), "r"), stryMutAct_9fa48("287") ? "" : (stryCov_9fa48("287"), "s"), stryMutAct_9fa48("288") ? "" : (stryCov_9fa48("288"), "t"), stryMutAct_9fa48("289") ? "" : (stryCov_9fa48("289"), "u"), stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), "v"), stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), "w"), stryMutAct_9fa48("292") ? "" : (stryCov_9fa48("292"), "x"), stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), "y"), stryMutAct_9fa48("294") ? "" : (stryCov_9fa48("294"), "z"), stryMutAct_9fa48("295") ? "" : (stryCov_9fa48("295"), "0"), stryMutAct_9fa48("296") ? "" : (stryCov_9fa48("296"), "1"), stryMutAct_9fa48("297") ? "" : (stryCov_9fa48("297"), "2"), stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), "3"), stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "4"), stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), "5"), stryMutAct_9fa48("301") ? "" : (stryCov_9fa48("301"), "6"), stryMutAct_9fa48("302") ? "" : (stryCov_9fa48("302"), "7"), stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), "8"), stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), "9"), stryMutAct_9fa48("305") ? "" : (stryCov_9fa48("305"), "escape"), stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), "enter"), stryMutAct_9fa48("307") ? "" : (stryCov_9fa48("307"), "tab"), stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), "space"), stryMutAct_9fa48("309") ? "" : (stryCov_9fa48("309"), "backspace"), stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), "delete"), stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), "arrowup"), stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), "arrowdown"), stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), "arrowleft"), stryMutAct_9fa48("314") ? "" : (stryCov_9fa48("314"), "arrowright")]);
export function KeyboardShortcuts({
  settings: _settings,
  onSaveSettings: _onSaveSettings
}: KeyboardShortcutsProps) {
  if (stryMutAct_9fa48("315")) {
    {}
  } else {
    stryCov_9fa48("315");
    const [searchQuery, setSearchQuery] = useState(stryMutAct_9fa48("316") ? "Stryker was here!" : (stryCov_9fa48("316"), ""));
    const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
      if (stryMutAct_9fa48("317")) {
        {}
      } else {
        stryCov_9fa48("317");
        // Safe localStorage access with SSR check
        if (stryMutAct_9fa48("320") ? typeof window === "undefined" : stryMutAct_9fa48("319") ? false : stryMutAct_9fa48("318") ? true : (stryCov_9fa48("318", "319", "320"), typeof window !== (stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), "undefined")))) {
          if (stryMutAct_9fa48("322")) {
            {}
          } else {
            stryCov_9fa48("322");
            const saved = localStorage.getItem(stryMutAct_9fa48("323") ? "" : (stryCov_9fa48("323"), "keyboard-shortcuts"));
            if (stryMutAct_9fa48("325") ? false : stryMutAct_9fa48("324") ? true : (stryCov_9fa48("324", "325"), saved)) {
              if (stryMutAct_9fa48("326")) {
                {}
              } else {
                stryCov_9fa48("326");
                try {
                  if (stryMutAct_9fa48("327")) {
                    {}
                  } else {
                    stryCov_9fa48("327");
                    return JSON.parse(saved);
                  }
                } catch {
                  if (stryMutAct_9fa48("328")) {
                    {}
                  } else {
                    stryCov_9fa48("328");
                    return defaultShortcuts;
                  }
                }
              }
            }
          }
        }
        return defaultShortcuts;
      }
    });
    useEffect(() => {
      if (stryMutAct_9fa48("329")) {
        {}
      } else {
        stryCov_9fa48("329");
        if (stryMutAct_9fa48("332") ? typeof window === "undefined" : stryMutAct_9fa48("331") ? false : stryMutAct_9fa48("330") ? true : (stryCov_9fa48("330", "331", "332"), typeof window !== (stryMutAct_9fa48("333") ? "" : (stryCov_9fa48("333"), "undefined")))) {
          if (stryMutAct_9fa48("334")) {
            {}
          } else {
            stryCov_9fa48("334");
            localStorage.setItem(stryMutAct_9fa48("335") ? "" : (stryCov_9fa48("335"), "keyboard-shortcuts"), JSON.stringify(shortcuts));
          }
        }
      }
    }, stryMutAct_9fa48("336") ? [] : (stryCov_9fa48("336"), [shortcuts]));
    const handleSaveShortcut = (id: string, updates: Partial<Shortcut>) => {
      if (stryMutAct_9fa48("337")) {
        {}
      } else {
        stryCov_9fa48("337");
        setShortcuts(stryMutAct_9fa48("338") ? () => undefined : (stryCov_9fa48("338"), prev => prev.map(stryMutAct_9fa48("339") ? () => undefined : (stryCov_9fa48("339"), s => (stryMutAct_9fa48("342") ? s.id !== id : stryMutAct_9fa48("341") ? false : stryMutAct_9fa48("340") ? true : (stryCov_9fa48("340", "341", "342"), s.id === id)) ? stryMutAct_9fa48("343") ? {} : (stryCov_9fa48("343"), {
          ...s,
          ...updates
        }) : s))));
      }
    };
    const handleReset = () => {
      if (stryMutAct_9fa48("344")) {
        {}
      } else {
        stryCov_9fa48("344");
        setShortcuts(defaultShortcuts);
        localStorage.removeItem(stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), "keyboard-shortcuts"));
      }
    };
    const filteredShortcuts = stryMutAct_9fa48("346") ? shortcuts : (stryCov_9fa48("346"), shortcuts.filter(stryMutAct_9fa48("347") ? () => undefined : (stryCov_9fa48("347"), s => stryMutAct_9fa48("350") ? s.enabled || s.key.toLowerCase().includes(searchQuery.toLowerCase()) || s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()) : stryMutAct_9fa48("349") ? false : stryMutAct_9fa48("348") ? true : (stryCov_9fa48("348", "349", "350"), s.enabled && (stryMutAct_9fa48("352") ? (s.key.toLowerCase().includes(searchQuery.toLowerCase()) || s.label.toLowerCase().includes(searchQuery.toLowerCase())) && s.description.toLowerCase().includes(searchQuery.toLowerCase()) : stryMutAct_9fa48("351") ? true : (stryCov_9fa48("351", "352"), (stryMutAct_9fa48("354") ? s.key.toLowerCase().includes(searchQuery.toLowerCase()) && s.label.toLowerCase().includes(searchQuery.toLowerCase()) : stryMutAct_9fa48("353") ? false : (stryCov_9fa48("353", "354"), (stryMutAct_9fa48("355") ? s.key.toUpperCase().includes(searchQuery.toLowerCase()) : (stryCov_9fa48("355"), s.key.toLowerCase().includes(stryMutAct_9fa48("356") ? searchQuery.toUpperCase() : (stryCov_9fa48("356"), searchQuery.toLowerCase())))) || (stryMutAct_9fa48("357") ? s.label.toUpperCase().includes(searchQuery.toLowerCase()) : (stryCov_9fa48("357"), s.label.toLowerCase().includes(stryMutAct_9fa48("358") ? searchQuery.toUpperCase() : (stryCov_9fa48("358"), searchQuery.toLowerCase())))))) || (stryMutAct_9fa48("359") ? s.description.toUpperCase().includes(searchQuery.toLowerCase()) : (stryCov_9fa48("359"), s.description.toLowerCase().includes(stryMutAct_9fa48("360") ? searchQuery.toUpperCase() : (stryCov_9fa48("360"), searchQuery.toLowerCase()))))))))));
    const groupedShortcuts = stryMutAct_9fa48("361") ? {} : (stryCov_9fa48("361"), {
      navigation: stryMutAct_9fa48("362") ? filteredShortcuts : (stryCov_9fa48("362"), filteredShortcuts.filter(stryMutAct_9fa48("363") ? () => undefined : (stryCov_9fa48("363"), s => stryMutAct_9fa48("366") ? s.category !== "navigation" : stryMutAct_9fa48("365") ? false : stryMutAct_9fa48("364") ? true : (stryCov_9fa48("364", "365", "366"), s.category === (stryMutAct_9fa48("367") ? "" : (stryCov_9fa48("367"), "navigation")))))),
      tasks: stryMutAct_9fa48("368") ? filteredShortcuts : (stryCov_9fa48("368"), filteredShortcuts.filter(stryMutAct_9fa48("369") ? () => undefined : (stryCov_9fa48("369"), s => stryMutAct_9fa48("372") ? s.category !== "tasks" : stryMutAct_9fa48("371") ? false : stryMutAct_9fa48("370") ? true : (stryCov_9fa48("370", "371", "372"), s.category === (stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), "tasks")))))),
      search: stryMutAct_9fa48("374") ? filteredShortcuts : (stryCov_9fa48("374"), filteredShortcuts.filter(stryMutAct_9fa48("375") ? () => undefined : (stryCov_9fa48("375"), s => stryMutAct_9fa48("378") ? s.category !== "search" : stryMutAct_9fa48("377") ? false : stryMutAct_9fa48("376") ? true : (stryCov_9fa48("376", "377", "378"), s.category === (stryMutAct_9fa48("379") ? "" : (stryCov_9fa48("379"), "search"))))))
    });
    const formatKey = (shortcut: Shortcut) => {
      if (stryMutAct_9fa48("380")) {
        {}
      } else {
        stryCov_9fa48("380");
        const parts: string[] = stryMutAct_9fa48("381") ? ["Stryker was here"] : (stryCov_9fa48("381"), []);
        if (stryMutAct_9fa48("383") ? false : stryMutAct_9fa48("382") ? true : (stryCov_9fa48("382", "383"), shortcut.meta)) parts.push(stryMutAct_9fa48("384") ? "" : (stryCov_9fa48("384"), "⌘"));
        if (stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386"), shortcut.shift)) parts.push(stryMutAct_9fa48("387") ? "" : (stryCov_9fa48("387"), "⇧"));
        parts.push(stryMutAct_9fa48("388") ? shortcut.key.toLowerCase() : (stryCov_9fa48("388"), shortcut.key.toUpperCase()));
        return parts.join(stryMutAct_9fa48("389") ? "" : (stryCov_9fa48("389"), "+"));
      }
    };
    return <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="kbd">⌘/Ctrl</kbd> + <kbd className="kbd">K</kbd> to open anytime. Customize your shortcuts below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shortcuts..." className="pl-9" value={searchQuery} onChange={stryMutAct_9fa48("390") ? () => undefined : (stryCov_9fa48("390"), e => setSearchQuery(e.target.value))} />
              {stryMutAct_9fa48("393") ? searchQuery || <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearchQuery("")}>
                  <X className="h-3 w-3" />
                </Button> : stryMutAct_9fa48("392") ? false : stryMutAct_9fa48("391") ? true : (stryCov_9fa48("391", "392", "393"), searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={stryMutAct_9fa48("394") ? () => undefined : (stryCov_9fa48("394"), () => setSearchQuery(stryMutAct_9fa48("395") ? "Stryker was here!" : (stryCov_9fa48("395"), "")))}>
                  <X className="h-3 w-3" />
                </Button>)}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <Switch checked={stryMutAct_9fa48("396") ? shortcuts.some(s => s.enabled) : (stryCov_9fa48("396"), shortcuts.every(stryMutAct_9fa48("397") ? () => undefined : (stryCov_9fa48("397"), s => s.enabled)))} onCheckedChange={checked => {
                if (stryMutAct_9fa48("398")) {
                  {}
                } else {
                  stryCov_9fa48("398");
                  setShortcuts(shortcuts.map(stryMutAct_9fa48("399") ? () => undefined : (stryCov_9fa48("399"), s => stryMutAct_9fa48("400") ? {} : (stryCov_9fa48("400"), {
                    ...s,
                    enabled: checked
                  }))));
                }
              }} />
              Enable all shortcuts
            </label>
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {Object.entries(groupedShortcuts).map(([category, items]) => {
                if (stryMutAct_9fa48("401")) {
                  {}
                } else {
                  stryCov_9fa48("401");
                  if (stryMutAct_9fa48("404") ? items.length !== 0 : stryMutAct_9fa48("403") ? false : stryMutAct_9fa48("402") ? true : (stryCov_9fa48("402", "403", "404"), items.length === 0)) return null;
                  const categoryLabels: Record<string, {
                    title: string;
                    icon: React.ReactNode;
                  }> = stryMutAct_9fa48("405") ? {} : (stryCov_9fa48("405"), {
                    navigation: stryMutAct_9fa48("406") ? {} : (stryCov_9fa48("406"), {
                      title: stryMutAct_9fa48("407") ? "" : (stryCov_9fa48("407"), "Navigation"),
                      icon: <Shield className="h-4 w-4" />
                    }),
                    tasks: stryMutAct_9fa48("408") ? {} : (stryCov_9fa48("408"), {
                      title: stryMutAct_9fa48("409") ? "" : (stryCov_9fa48("409"), "Tasks"),
                      icon: <Plus className="h-4 w-4" />
                    }),
                    search: stryMutAct_9fa48("410") ? {} : (stryCov_9fa48("410"), {
                      title: stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), "Search"),
                      icon: <Search className="h-4 w-4" />
                    })
                  });
                  return <div key={category} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {stryMutAct_9fa48("412") ? categoryLabels[category].icon : (stryCov_9fa48("412"), categoryLabels[category]?.icon)}
                      {stryMutAct_9fa48("413") ? categoryLabels[category].title : (stryCov_9fa48("413"), categoryLabels[category]?.title)}
                    </h3>
                    <div className="space-y-1">
                      {items.map(stryMutAct_9fa48("414") ? () => undefined : (stryCov_9fa48("414"), shortcut => <ShortcutItem key={shortcut.id} shortcut={shortcut} onSave={handleSaveShortcut} formatKey={formatKey} />))}
                    </div>
                  </div>;
                }
              })}
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground">
            <p>Tip: On Mac, use ⌘ instead of Ctrl. On Windows, use Ctrl.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
  }
}
interface ShortcutItemProps {
  shortcut: Shortcut;
  onSave: (id: string, updates: Partial<Shortcut>) => void;
  formatKey: (shortcut: Shortcut) => string;
}
function ShortcutItem({
  shortcut,
  onSave,
  formatKey
}: ShortcutItemProps) {
  if (stryMutAct_9fa48("415")) {
    {}
  } else {
    stryCov_9fa48("415");
    const [isEditing, setIsEditing] = useState(stryMutAct_9fa48("416") ? true : (stryCov_9fa48("416"), false));
    const [editKey, setEditKey] = useState(stryMutAct_9fa48("417") ? shortcut.key && "" : (stryCov_9fa48("417"), shortcut.key ?? (stryMutAct_9fa48("418") ? "Stryker was here!" : (stryCov_9fa48("418"), ""))));
    const [editMeta, setEditMeta] = useState(stryMutAct_9fa48("419") ? shortcut.meta && false : (stryCov_9fa48("419"), shortcut.meta ?? (stryMutAct_9fa48("420") ? true : (stryCov_9fa48("420"), false))));
    const [editShift, setEditShift] = useState(stryMutAct_9fa48("421") ? shortcut.shift && false : (stryCov_9fa48("421"), shortcut.shift ?? (stryMutAct_9fa48("422") ? true : (stryCov_9fa48("422"), false))));
    const handleSave = () => {
      if (stryMutAct_9fa48("423")) {
        {}
      } else {
        stryCov_9fa48("423");
        // Check for conflicts
        const conflictingShortcut = defaultShortcuts.find(stryMutAct_9fa48("424") ? () => undefined : (stryCov_9fa48("424"), s => stryMutAct_9fa48("427") ? s.key === editKey && s.shift === editShift && s.meta === editMeta || s.id !== shortcut.id : stryMutAct_9fa48("426") ? false : stryMutAct_9fa48("425") ? true : (stryCov_9fa48("425", "426", "427"), (stryMutAct_9fa48("429") ? s.key === editKey && s.shift === editShift || s.meta === editMeta : stryMutAct_9fa48("428") ? true : (stryCov_9fa48("428", "429"), (stryMutAct_9fa48("431") ? s.key === editKey || s.shift === editShift : stryMutAct_9fa48("430") ? true : (stryCov_9fa48("430", "431"), (stryMutAct_9fa48("433") ? s.key !== editKey : stryMutAct_9fa48("432") ? true : (stryCov_9fa48("432", "433"), s.key === editKey)) && (stryMutAct_9fa48("435") ? s.shift !== editShift : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435"), s.shift === editShift)))) && (stryMutAct_9fa48("437") ? s.meta !== editMeta : stryMutAct_9fa48("436") ? true : (stryCov_9fa48("436", "437"), s.meta === editMeta)))) && (stryMutAct_9fa48("439") ? s.id === shortcut.id : stryMutAct_9fa48("438") ? true : (stryCov_9fa48("438", "439"), s.id !== shortcut.id)))));
        if (stryMutAct_9fa48("441") ? false : stryMutAct_9fa48("440") ? true : (stryCov_9fa48("440", "441"), conflictingShortcut)) {
          if (stryMutAct_9fa48("442")) {
            {}
          } else {
            stryCov_9fa48("442");
            return; // Don't allow conflicts for now
          }
        }
        onSave(shortcut.id, stryMutAct_9fa48("443") ? {} : (stryCov_9fa48("443"), {
          key: editKey,
          meta: stryMutAct_9fa48("446") ? editMeta && undefined : stryMutAct_9fa48("445") ? false : stryMutAct_9fa48("444") ? true : (stryCov_9fa48("444", "445", "446"), editMeta || undefined),
          shift: stryMutAct_9fa48("449") ? editShift && undefined : stryMutAct_9fa48("448") ? false : stryMutAct_9fa48("447") ? true : (stryCov_9fa48("447", "448", "449"), editShift || undefined),
          custom: stryMutAct_9fa48("450") ? false : (stryCov_9fa48("450"), true)
        }));
        setIsEditing(stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451"), false));
      }
    };
    if (stryMutAct_9fa48("453") ? false : stryMutAct_9fa48("452") ? true : (stryCov_9fa48("452", "453"), isEditing)) {
      if (stryMutAct_9fa48("454")) {
        {}
      } else {
        stryCov_9fa48("454");
        return <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/50">
        <Select value={editKey} onValueChange={stryMutAct_9fa48("455") ? () => undefined : (stryCov_9fa48("455"), v => setEditKey(stryMutAct_9fa48("456") ? v && "" : (stryCov_9fa48("456"), v ?? (stryMutAct_9fa48("457") ? "Stryker was here!" : (stryCov_9fa48("457"), "")))))}>
          <SelectTrigger className="h-7 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableKeys.map(stryMutAct_9fa48("458") ? () => undefined : (stryCov_9fa48("458"), key => <SelectItem key={key} value={key}>
                {stryMutAct_9fa48("459") ? key.toLowerCase() : (stryCov_9fa48("459"), key.toUpperCase())}
              </SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Switch checked={editMeta} onCheckedChange={setEditMeta} className="h-4 w-8" />
          <span className="text-xs">Meta</span>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={editShift} onCheckedChange={setEditShift} className="h-4 w-8" />
          <span className="text-xs">Shift</span>
        </div>
        <Button size="sm" onClick={handleSave} className="h-7 w-7 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={stryMutAct_9fa48("460") ? () => undefined : (stryCov_9fa48("460"), () => setIsEditing(stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461"), false)))} className="h-7 w-7 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>;
      }
    }
    return <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent group">
      <div className="flex items-center gap-2">
        <kbd className="kbd text-sm min-w-[36px] text-center">{formatKey(shortcut)}</kbd>
        <span className="text-sm">{shortcut.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{shortcut.description}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={stryMutAct_9fa48("462") ? () => undefined : (stryCov_9fa48("462"), () => setIsEditing(stryMutAct_9fa48("463") ? false : (stryCov_9fa48("463"), true)))}>
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
    </div>;
  }
}

// Keyboard shortcut cheat sheet component
export function KeyboardCheatsheet() {
  if (stryMutAct_9fa48("464")) {
    {}
  } else {
    stryCov_9fa48("464");
    return <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {(stryMutAct_9fa48("465") ? [] : (stryCov_9fa48("465"), [stryMutAct_9fa48("466") ? {} : (stryCov_9fa48("466"), {
        keys: stryMutAct_9fa48("467") ? [] : (stryCov_9fa48("467"), [stryMutAct_9fa48("468") ? "" : (stryCov_9fa48("468"), "⌘"), stryMutAct_9fa48("469") ? "" : (stryCov_9fa48("469"), "N")]),
        desc: stryMutAct_9fa48("470") ? "" : (stryCov_9fa48("470"), "New Task")
      }), stryMutAct_9fa48("471") ? {} : (stryCov_9fa48("471"), {
        keys: stryMutAct_9fa48("472") ? [] : (stryCov_9fa48("472"), [stryMutAct_9fa48("473") ? "" : (stryCov_9fa48("473"), "⌘"), stryMutAct_9fa48("474") ? "" : (stryCov_9fa48("474"), "/")]),
        desc: stryMutAct_9fa48("475") ? "" : (stryCov_9fa48("475"), "Search")
      }), stryMutAct_9fa48("476") ? {} : (stryCov_9fa48("476"), {
        keys: stryMutAct_9fa48("477") ? [] : (stryCov_9fa48("477"), [stryMutAct_9fa48("478") ? "" : (stryCov_9fa48("478"), "⌘"), stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), "K")]),
        desc: stryMutAct_9fa48("480") ? "" : (stryCov_9fa48("480"), "Shortcuts")
      }), stryMutAct_9fa48("481") ? {} : (stryCov_9fa48("481"), {
        keys: stryMutAct_9fa48("482") ? [] : (stryCov_9fa48("482"), [stryMutAct_9fa48("483") ? "" : (stryCov_9fa48("483"), "1")]),
        desc: stryMutAct_9fa48("484") ? "" : (stryCov_9fa48("484"), "Today View")
      }), stryMutAct_9fa48("485") ? {} : (stryCov_9fa48("485"), {
        keys: stryMutAct_9fa48("486") ? [] : (stryCov_9fa48("486"), [stryMutAct_9fa48("487") ? "" : (stryCov_9fa48("487"), "2")]),
        desc: stryMutAct_9fa48("488") ? "" : (stryCov_9fa48("488"), "Kanban View")
      }), stryMutAct_9fa48("489") ? {} : (stryCov_9fa48("489"), {
        keys: stryMutAct_9fa48("490") ? [] : (stryCov_9fa48("490"), [stryMutAct_9fa48("491") ? "" : (stryCov_9fa48("491"), "3")]),
        desc: stryMutAct_9fa48("492") ? "" : (stryCov_9fa48("492"), "Analytics")
      }), stryMutAct_9fa48("493") ? {} : (stryCov_9fa48("493"), {
        keys: stryMutAct_9fa48("494") ? [] : (stryCov_9fa48("494"), [stryMutAct_9fa48("495") ? "" : (stryCov_9fa48("495"), "C")]),
        desc: stryMutAct_9fa48("496") ? "" : (stryCov_9fa48("496"), "Calendar")
      }), stryMutAct_9fa48("497") ? {} : (stryCov_9fa48("497"), {
        keys: stryMutAct_9fa48("498") ? [] : (stryCov_9fa48("498"), [stryMutAct_9fa48("499") ? "" : (stryCov_9fa48("499"), "G")]),
        desc: stryMutAct_9fa48("500") ? "" : (stryCov_9fa48("500"), "Gantt Chart")
      }), stryMutAct_9fa48("501") ? {} : (stryCov_9fa48("501"), {
        keys: stryMutAct_9fa48("502") ? [] : (stryCov_9fa48("502"), [stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), "M")]),
        desc: stryMutAct_9fa48("504") ? "" : (stryCov_9fa48("504"), "Eisenhower Matrix")
      })])).map(stryMutAct_9fa48("505") ? () => undefined : (stryCov_9fa48("505"), (item, i) => <div key={i} className="flex items-center gap-2">
          <kbd className="kbd">{item.keys.join(stryMutAct_9fa48("506") ? "" : (stryCov_9fa48("506"), "+"))}</kbd>
          <span className="text-muted-foreground">{item.desc}</span>
        </div>))}
    </div>;
  }
}