import { useEffect, useState } from "react";
import ClickAwayListener from "react-click-away-listener";
import { getNewID } from "../../utils/util-functions";
import { IoMdArrowDropdown } from "react-icons/io";
import { twMerge } from "tailwind-merge";

interface Option {
    label: any;
    value: any;
    component?: React.ReactNode;
}

type Variant = "normal" | "transparent";
const variants = {
    normal: {
        arrowColor: "black",
        bgColor: "white",
        menuBg: "white",
        hoverMenuBg: "hover:bg-slate-200",
    },
    transparent: {
        arrowColor: "rgba(255,255,255,0.5)",
        bgColor: "rgba(0,0,0,0.2)",
        menuBg: "rgba(0,0,0,0.2)",
        hoverMenuBg: "hover:bg-opacity-10",
    },
};

interface DropDownProps {
    options: Option[];
    onChange: (value: any) => void;
    defaultValue?: Option["value"];
    selectable?: boolean;
    variant?: Variant;
}

export const DropDown = ({
    options,
    onChange,
    defaultValue,
    selectable = false,
    variant = "normal",
}: DropDownProps) => {
    const [selectedValue, setSelectedValue] = useState<React.ReactNode>(
        defaultValue ?? options[0].value
    );
    const [open, setOpen] = useState<boolean>(false);

    const handleSelect = ({ value, component, label }: Option) => {
        setSelectedValue(component ?? label);
        setOpen(false);
        onChange(value);
    };

    useEffect(() => {
        setSelectedValue(defaultValue);
    }, [defaultValue]);
    const handleToggleOpen = () => setOpen(!open);

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <div
                className={twMerge(
                    "relative drop-shadow-lg z-[1000] rounded-md px-2 py-1 select-none"
                )}
                style={{
                    backgroundColor: variants[variant].bgColor,
                }}
            >
                <div
                    className="flex items-center justify-center h-6 rounded-md cursor-pointer w-max"
                    onClick={handleToggleOpen}
                >
                    <div className="m-1">{selectedValue}</div>
                    <IoMdArrowDropdown
                        className="w-6 h-6"
                        style={{
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                            color: variants[variant].arrowColor,
                        }}
                    />
                </div>
                <div
                    className="absolute left-0 z-[1000] rounded-md mt-2 cursor-pointer w-max overflow-hidden"
                    style={{
                        maxHeight: open ? window.innerHeight - 50 + "px" : 0,
                        backgroundColor: variants[variant].menuBg,
                        paddingTop: open ? "0.25rem" : 0,
                        transition: "max-height 200ms",
                    }}
                >
                    {options.map((option: Option) => (
                        <div
                            key={getNewID()}
                            className={twMerge(
                                "px-2 hover:bg-slate-200 h-8 flex items-center",
                                variants[variant].hoverMenuBg
                            )}
                            onClick={() => handleSelect(option)}
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
                                        checked={selectedValue === option.value}
                                    />
                                )}
                                {option.component ? (
                                    <div className="p-2">
                                        {option.component}
                                    </div>
                                ) : (
                                    option.label
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ClickAwayListener>
    );
};
