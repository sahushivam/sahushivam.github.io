(() => {
  "use strict";

  /* ── Mobile navigation toggle ─────────────────────────────── */
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.getElementById("primary-navigation");

  if (menuButton && navigation) {
    const setMenuOpen = (isOpen) => {
      menuButton.setAttribute("aria-expanded", String(isOpen));
      navigation.classList.toggle("is-open", isOpen);
    };

    setMenuOpen(false);
    document.documentElement.classList.add("js-enabled");

    menuButton.addEventListener("click", () => {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        menuButton.getAttribute("aria-expanded") === "true" &&
        !document.querySelector("dialog[open]")
      ) {
        setMenuOpen(false);
        menuButton.focus();
      }
    });
  }

  /* ── Dialog / modal handling with focus restoration ────────── */
  const dialogTriggerMap = new WeakMap();

  document.querySelectorAll("[data-dialog]").forEach((button) => {
    const dialog = document.getElementById(button.dataset.dialog);
    if (!(dialog instanceof HTMLDialogElement)) return;

    button.addEventListener("click", () => {
      if (!dialog.open) {
        dialogTriggerMap.set(dialog, button);
        document.body.style.overflow = "hidden";
        dialog.showModal();
      }
    });
  });

  function closeDialog(dialog) {
    dialog.close();
    document.body.style.overflow = "";
    const trigger = dialogTriggerMap.get(dialog);
    if (trigger && typeof trigger.focus === "function") {
      trigger.focus();
    }
  }

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(dialog));
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        closeDialog(dialog);
        return;
      }
      const bounds = dialog.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (outside) closeDialog(dialog);
    });

    dialog.addEventListener("cancel", () => {
      document.body.style.overflow = "";
      const trigger = dialogTriggerMap.get(dialog);
      if (trigger && typeof trigger.focus === "function") {
        trigger.focus();
      }
    });
  });

  /* ── Back-to-top button via IntersectionObserver ───────────── */
  const toTopButton = document.getElementById("toTop");
  if (toTopButton) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText =
      "position:absolute;top:0;left:0;width:1px;height:300px;pointer-events:none;";
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => {
        toTopButton.classList.toggle("is-visible", !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
  }
})();
