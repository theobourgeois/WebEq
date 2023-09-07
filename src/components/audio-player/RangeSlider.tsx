import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { twMerge } from "tailwind-merge";
import { THEME_MAP } from "../../utils/constants";
import { EqualizerTheme } from "../equalizer/Equalizer";

interface RangeSliderProps {
    min: number;
    max: number;
    step: number;
    value: number;
    vertical?: boolean;
    theme: EqualizerTheme;
    onChange?: (value: number) => void;
}

function roundToStep(number: number, step: number) {
    return Math.round(number / step) * step;
}
let mouseDown = false;
const RangeSlider = forwardRef((props: RangeSliderProps, ref) => {
    useImperativeHandle(ref, () => ({
        seekTo: (value: number) => {
            setProgress(value);
        },
    }));
    const containerRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(props.value);

    function handleMouseDown() {
        mouseDown = true;
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }

    function handleMouseUp() {
        mouseDown = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    }

    function handleMouseMove(e: React.MouseEvent | MouseEvent) {
        if (!mouseDown && e.type === "mousemove") return;
        if (!containerRef.current) return;
        const knobWidth = 12;
        const targetRect = containerRef.current.getBoundingClientRect();
        const width = targetRect.width - knobWidth;
        const height = targetRect.height - knobWidth;
        let x = e.clientX - targetRect.left;
        let y = e.clientY - targetRect.top;

        // Clamp x value within the bounds
        x = Math.max(0, Math.min(x, width));
        y = Math.max(0, Math.min(y, height));

        const progress = !props.vertical
            ? (x / width) * props.max
            : ((height - y) / height) * props.max;
        setProgress(progress);

        if (!knobRef.current) return;
        const ratio = props.vertical ? y / height : x / width;
        let value = roundToStep(ratio * props.max, props.step);
        if (value == 0 && props.min > 0) value = 1;
        if (!props.onChange) return;
        props.onChange(props.vertical ? props.max - value : value);
    }

    return (
        <div
            ref={containerRef}
            onClick={handleMouseMove}
            onMouseDown={handleMouseDown}
            className="w-full h-full flex justify-center items-center flex-col relative cursor-pointer"
        >
            <div
                ref={knobRef}
                style={{
                    bottom: props.vertical
                        ? `${Math.min((progress / props.max) * 100, 90)}%`
                        : "",
                    left: !props.vertical
                        ? `${Math.min((progress / props.max) * 100, 98)}%`
                        : "-9px",
                }}
                className="cursor-pointer absolute w-4 h-4 outline outline-gray-400 z-[100] rounded-full bg-white hover:scale-110 transition-transform"
            ></div>
            <div className="flex w-full items-center">
                <div
                    className={twMerge(
                        "absolute z-[99] rounded-md",
                        THEME_MAP[props.theme].medium,
                        THEME_MAP[props.theme].light_hover
                    )}
                    style={{
                        left: props.vertical ? "-5px" : "",
                        bottom: props.vertical ? "0" : "",
                        height: props.vertical
                            ? `${(progress / props.max) * 100}%`
                            : "8px",
                        width: !props.vertical
                            ? `${(progress / props.max) * 100}%`
                            : "8px",
                    }}
                ></div>
                <div
                    className="bg-gray-300 absolute rounded-md hover:bg-gray-400 transition-colors"
                    style={{
                        left: props.vertical ? "-5px" : "",
                        height: props.vertical ? "100%" : "8px",
                        width: !props.vertical ? "100%" : "8px",
                    }}
                ></div>
            </div>
        </div>
    );
});

export default RangeSlider;
