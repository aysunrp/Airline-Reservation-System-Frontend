import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import * as auth from "../core/auth.js";
import { ok, fail, confirmDialog } from "../core/ui.js";
import { day, roleLabel } from "../core/format.js";
import { pageHead, card, button, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { searchBox, filterSelect, toolbar, yesNoAll } from "../components/toolbar.js";
import { badge, activeBadge } from "../components/badge.js";
import { openForm } from "../components/form.js";

const ROLE_OPTIONS = [{ value: "", label: "Bütün rollar" }, { value: "User", label: "İstifadəçi" }, { value: "Admin", label: "Admin" }, { value: "SuperAdmin", label: "SuperAdmin" }];

export async function render(ctx) {
    const f = { search: "", role: "", isActive: "" };
    const listBox = h("div");
    const me = auth.user();

    const act = async (user, kind) => {
        const name = `${user.firstName} ${user.lastName}`;
        const plans = {
            makeAdmin: ["Admin rolu verilsin?", `${name} admin bölməsindən istifadə edə biləcək.`, "Admin et", false, () => api.put(`api/admin/users/${user.id}/role`, { role: "Admin" })],
            removeAdmin: ["Admin rolu alınsın?", `${name} adminlikdən çıxır, açıq sessiyaları dərhal dayanır.`, "Adminliyi al", true, () => api.put(`api/admin/users/${user.id}/role`, { role: "User" })],
            deactivate: ["Hesab deaktiv edilsin?", `${name} daxil ola bilməyəcək, açıq sessiyaları dərhal dayanacaq.`, "Deaktiv et", true, () => api.put(`api/admin/users/${user.id}/active`, { isActive: false })],
            activate: ["Hesab yenidən aktiv edilsin?", `${name} yenidən daxil ola biləcək.`, "Aktiv et", false, () => api.put(`api/admin/users/${user.id}/active`, { isActive: true })],
            remove: ["Hesab silinsin?", `${name} hesabı silinəcək. Bu geri qaytarıla bilməz. Rezervasiyası olan hesab silinmir, onu deaktiv et.`, "Sil", true, () => api.del(`api/admin/users/${user.id}`)]
        };
        const [title, text, label, danger, run] = plans[kind];
        if (!(await confirmDialog({ title, text, confirmLabel: label, danger }))) return;
        try { await run(); ok("Hazırdır."); load(); } catch (error) { fail(api.message(error)); }
    };

    const load = async () => {
        mount(listBox, loadingBlock());
        try {
            const rows = await api.get("api/admin/users", { take: 200, search: f.search, role: f.role, isActive: f.isActive });
            mount(listBox, dataTable(rows, [
                { label: "İstifadəçi", render: (r) => cellMain(`${r.firstName} ${r.lastName}` + (me && me.id === r.id ? " (sən)" : ""), r.email) },
                { label: "Rol", render: (r) => badge(roleLabel(r.role), r.role === "SuperAdmin" ? "accent" : r.role === "Admin" ? "info" : "neutral") },
                { label: "Status", render: (r) => activeBadge(r.isActive) },
                { label: "E-poçt təsdiqi", render: (r) => (r.emailVerified ? "Bəli" : "Xeyr") },
                { label: "Yaradılıb", render: (r) => day(r.createdAt) }
            ], {
                actions: (r) => {
                    const self = !!me && me.id === r.id;
                    return [
                        { label: "Admin et", onClick: () => act(r, "makeAdmin"), hidden: r.role !== "User" },
                        { label: "Adminliyi al", onClick: () => act(r, "removeAdmin"), hidden: r.role !== "Admin" },
                        { label: r.isActive ? "Deaktiv et" : "Aktiv et", onClick: () => act(r, r.isActive ? "deactivate" : "activate"), hidden: self, danger: r.isActive },
                        "-",
                        { label: "Sil", onClick: () => act(r, "remove"), danger: true, hidden: self }
                    ];
                },
                emptyTitle: "Hesab tapılmadı"
            }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };

    const addAdmin = async () => {
        const saved = await openForm({
            title: "Yeni admin hesabı", submitLabel: "Hesabı yarat",
            fields: [
                { key: "firstName", label: "Ad" }, { key: "lastName", label: "Soyad" },
                { key: "email", label: "E-poçt", type: "email", span2: true },
                { key: "password", label: "Parol", type: "password", span2: true, hint: "Ən azı 8 simvol, hərf və rəqəm." }
            ],
            onSubmit: (d) => api.post("api/admin/users", { firstName: d.firstName, lastName: d.lastName, email: d.email, password: d.password })
        });
        if (saved) { ok("Admin hesabı yaradıldı."); load(); }
    };

    ctx.container.replaceChildren(
        pageHead({ title: "İstifadəçilər", desc: "Hesablar, rollar və giriş. Yalnız SuperAdmin görür; öz hesabını dəyişə bilməzsən.", actions: [button("Yeni admin", { variant: "primary", iconName: "plus", onClick: addAdmin })] }),
        card(toolbar(searchBox({ placeholder: "Ad və ya e-poçt…", onInput: (v) => { f.search = v; load(); } }),
            filterSelect({ label: "Rol", options: ROLE_OPTIONS, onChange: (v) => { f.role = v; load(); } }),
            filterSelect({ label: "Status", options: yesNoAll(), onChange: (v) => { f.isActive = v === "" ? "" : v === "Active" ? "true" : "false"; load(); } })), listBox));
    await load();
}
