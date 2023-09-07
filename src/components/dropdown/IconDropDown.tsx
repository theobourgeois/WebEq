import { useEffect, useState } from "react";
import ClickAwayListener from "react-click-away-listener";
import { IoMdArrowDropdown } from "react-icons/io";
import { twMerge } from "tailwind-merge";
import { getNewID } from "../../utils/util-functions";

interface Option {
    label: any;
    value: any;
}

interface Theme {
    color: string;
    hover: string;
}

interface IconDropDownProps {
    options: Option[];
    onChange: (value: any) => void;
    defaultValue?: Option["value"];
    icon: React.ReactNode;
    selectable?: boolean;
    title?: string;
    theme: Theme;
}

export const IconDropDown = ({
    options,
    onChange,
    defaultValue,
    icon,
    theme,
    selectable = false,
    title = "",
}: IconDropDownProps) => {
    const [selectedValue, setSelectedValue] =
        useState<Option["value"]>(defaultValue);
    const [open, setOpen] = useState<boolean>(false);

    const handleSelect = (value: Option["value"]) => {
        setSelectedValue(value);
        setOpen(false);
        onChange(value);
    };

    useEffect(() => {
        setSelectedValue(defaultValue);
    }, [defaultValue]);
    const handleToggleOpen = () => setOpen(!open);

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <div className="relative select-none z-[2000]" title={title}>
                <div
                    className={twMerge(
                        "flex items-center justify-center h-8 w-max rounded-md px-1 cursor-pointer min-w-[24px]",
                        theme.color,
                        theme.hover
                    )}
                    onClick={handleToggleOpen}
                >
                    {icon}
                    <IoMdArrowDropdown
                        className="w-6 h-6"
                        color="white"
                        style={{
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                    />
                </div>
                {open && (
                    <div
                        className="absolute mt-1 left-0 z-[1000] bg-white w-max p-2 rounded-md overflow-auto"
                        style={{ maxHeight: window.innerHeight - 50 + "px" }}
                    >
                        {options.map((option: Option) => (
                            <div
                                key={getNewID()}
                                className={
                                    selectedValue === option.value && selectable
                                        ? "px-2 bg-slate-200"
                                        : "px-2 bg-white hover:bg-slate-200"
                                }
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className="flex">
                                    {selectable && (
                                        <input
                                            className="mr-2"
                                            type="radio"
                                            name="snap"
                                            onChange={() =>
                                                handleSelect(option.value)
                                            }
                                            checked={(() => {
                                                console.log(selectedValue);
                                                return (
                                                    selectedValue ===
                                                    option.value
                                                );
                                            })()}
                                        />
                                    )}

                                    {option.label}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ClickAwayListener>
    );
};
