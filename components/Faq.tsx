"use client";

import { useId, useState } from "react";
import { Icon } from "@/lib/icons";
import { FAQ } from "@/lib/data";

/**
 * Accordion FAQ. One panel open at a time; the open one is picked out with an
 * amber border and a warm tint.
 *
 * The open/close animation uses the grid-rows 0fr -> 1fr trick so the height
 * transitions smoothly without measuring the content or hardcoding a height.
 */
export function Faq() {
  // First panel starts open so the section doesn't read as a wall of bars.
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="mx-auto mt-11 flex max-w-[880px] flex-col gap-3">
      {FAQ.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;

        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-xl border transition-colors duration-200 ${
              open
                ? "border-brand/70 bg-brand/[0.045]"
                : "border-transparent bg-card-2 hover:bg-[#1b1b1f]"
            }`}
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full cursor-pointer items-center gap-5 px-6 py-5 text-left sm:px-7"
              >
                <span className="flex-1 font-sans text-[17px] font-medium leading-snug tracking-normal text-white sm:text-[19px]">
                  {item.q}
                </span>
                <Icon
                  name="chevronDown"
                  size={20}
                  className={`flex-none transition-transform duration-300 ${
                    open ? "rotate-180 text-brand" : "text-muted"
                  }`}
                />
              </button>
            </h3>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="border-t border-brand/20 px-6 pb-6 pt-5 text-[15.5px] leading-relaxed text-muted sm:px-7"
                >
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
