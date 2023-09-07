import * as React from "react";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import {
    DEFAULT_CURVE,
    EQUALIZER_DIMENSIONS,
    MAX_FREQUENCY,
    MAX_GAIN,
    MIN_FREQUENCY,
    MIN_GAIN,
    POINT_RADIUS,
    THEME_MAP,
} from "../../utils/constants";
import { RxCross2 } from "react-icons/rx";
import { getNewID } from "../../utils/util-functions";
import { twMerge } from "tailwind-merge";
import { audioContext } from "../../utils/globals";

export type EqualizerPoint = {
    frequency: number;
    gain: number;
    curve: number;
    id: number;
    type: EqualizerType;
};

export enum EqualizerType {
    PEAKING = "peaking",
    HIGH_PASS = "highpass",
    LOW_PASS = "lowpass",
}

export enum EqualizerTheme {
    GRAY = "gray",
    RED = "red",
    BLUE = "blue",
    GREEN = "green",
    PURPLE = "purple",
    ORANGE = "orange",
    INDIGO = "indigo",
    PINK = "pink",
    TEAL = "teal",
}

const MAX_SCROLL = 200;

function getYFromGain(gain: number) {
    const { height } = EQUALIZER_DIMENSIONS;
    return ((gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN)) * height;
}

function getXfromFrequency(frequency: number) {
    const { width } = EQUALIZER_DIMENSIONS;
    const normalizedFrequency =
        Math.log(frequency / MIN_FREQUENCY) /
        Math.log(MAX_FREQUENCY / MIN_FREQUENCY);
    return normalizedFrequency * width;
}

function getGainFromY(y: number) {
    const range = MAX_GAIN - MIN_GAIN;
    const normalizedValue =
        1 - (EQUALIZER_DIMENSIONS.height - y) / EQUALIZER_DIMENSIONS.height;
    return normalizedValue * range - MAX_GAIN;
}

function getFrequencyFromX(x: number) {
    const { width } = EQUALIZER_DIMENSIONS;
    const minFrequency = 20;
    const maxFrequency = 20000;
    const normalizedX = x / width;
    return minFrequency * Math.pow(maxFrequency / minFrequency, normalizedX);
}

function getDimensionsFromFrequencyAndGain(frequency: number, gain: number) {
    const x = getXfromFrequency(frequency);
    const y = getYFromGain(gain);
    return { x, y };
}

function getFrequencyAndGainFromDimensions(x: number, y: number) {
    const frequency = getFrequencyFromX(x);
    const gain = getGainFromY(y);
    return { frequency, gain };
}

const getClosestPoint = (
    frequency: number,
    gain: number,
    points: EqualizerPoint[],
    threshold = 0
) => {
    const { height } = EQUALIZER_DIMENSIONS;
    const { x, y } = getDimensionsFromFrequencyAndGain(frequency, gain);
    const closestPoint = points.find((p) => {
        const comparePoint = getDimensionsFromFrequencyAndGain(
            p.frequency,
            p.gain
        );
        return (
            comparePoint.x + POINT_RADIUS + threshold > x &&
            comparePoint.x - POINT_RADIUS - threshold < x &&
            y + POINT_RADIUS + threshold > height - comparePoint.y &&
            y - POINT_RADIUS - threshold < height - comparePoint.y
        );
    });
    return closestPoint;
};

interface EqualizerProps {
    audioElement: HTMLAudioElement | null;
    audioSourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
    theme?: EqualizerTheme;
}

export const Equalizer = forwardRef(
    (
        {
            theme = EqualizerTheme.GRAY,
            audioElement,
            audioSourceRef,
        }: EqualizerProps,
        ref
    ): JSX.Element => {
        useImperativeHandle(ref, () => ({
            reset: () => setPoints([]),
            setPoints: (points: EqualizerPoint[]) => {
                setPoints([...points]);
            },
            getPoints: () => {
                return points;
            },
            handleAddFilter: (
                audioContext: AudioContext,
                audioBuffer = null
            ) => {
                return handleAddFilter(audioContext, audioBuffer);
            },
        }));
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [points, setPoints] = useState<EqualizerPoint[]>([]);
        const [pointTag, setPointTag] = useState<any | null>(null);

        useEffect(() => {
            audioSourceRef.current = null;
        }, [audioElement]);

        useEffect(() => {
            renderCurves();
            renderGraphLines();
            renderPoints();
            handleAddFilter(audioContext);
        }, [points, audioElement]);

        const handleAddFilter = async (
            audioContext: AudioContext,
            audioBuffer = null
        ) => {
            if (!audioElement) return;

            let source;
            if (audioBuffer) {
                source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
            } else {
                if (!audioSourceRef.current) {
                    audioSourceRef.current =
                        audioContext.createMediaElementSource(audioElement);
                }
                source = audioSourceRef.current;
            }

            // Disconnect the default connection to avoid double playing
            source.disconnect();

            // Keep track of the last node to connect filters in series
            let lastNode: AudioNode = source;

            // Iterate over each equalizer point to create a filter
            for (const point of points) {
                const filter = audioContext.createBiquadFilter();
                filter.type = point.type;
                filter.frequency.value = point.frequency;
                if (point.type === EqualizerType.PEAKING)
                    filter.gain.value = point.gain;
                const targetValue = point.gain + 4;
                const transitionDuration = 0.9;
                filter.gain.setValueAtTime(
                    filter.gain.value,
                    audioContext.currentTime
                );
                filter.gain.linearRampToValueAtTime(
                    targetValue,
                    audioContext.currentTime + transitionDuration
                );

                const baseValue = 5;
                filter.Q.value = baseValue / point.curve;

                lastNode.connect(filter);
                lastNode = filter;
            }

            // Connect the last filter to the destination
            lastNode.connect(audioContext.destination);
            return source;
        };

        const renderGraphLines = () => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            if (!context) return;
            const { width, height } = EQUALIZER_DIMENSIONS;
            context.strokeStyle = "rgba(200, 200, 200, 0.2)";
            context.lineWidth = 2;

            const frequencyLines = [
                30, 40, 50, 60, 70, 100, 200, 250, 300, 400, 500, 600, 700, 800,
                900, 1000, 2000, 2500, 2700, 5000, 6000, 7000, 8000, 9000,
                10000,
            ];
            const textLines = [
                40, 70, 100, 200, 300, 500, 700, 1000, 2000, 5000, 10000,
            ];
            const usedFrequencyLines: number[] = [];
            // draw vertical lines
            for (let i = 0; i < width; i++) {
                const freq = Math.floor(getFrequencyFromX(i));
                const freqThreshold = freq > 200 ? 100 : 10;
                const isFreqLine = frequencyLines.find(
                    (f) => freq + freqThreshold > f && f > freq - freqThreshold
                );
                const isTextLine = textLines.find(
                    (f) => isFreqLine === f && !usedFrequencyLines.includes(f)
                );

                if (isFreqLine && !usedFrequencyLines.includes(isFreqLine)) {
                    usedFrequencyLines.push(isFreqLine);
                    context.beginPath();
                    context.moveTo(i, 0);
                    context.lineTo(i, EQUALIZER_DIMENSIONS.height);
                    context.stroke();
                    if (isTextLine) {
                        context.font = "12px Arial";
                        context.fillText(
                            `${isTextLine} Hz`,
                            i - 20,
                            EQUALIZER_DIMENSIONS.height - 10
                        );
                    }
                }
            }
            // draw horizontal lines
            context.beginPath();
            context.moveTo(0, EQUALIZER_DIMENSIONS.height / 4);
            context.lineTo(width, EQUALIZER_DIMENSIONS.height / 4);
            context.stroke();
            context.beginPath();
            context.moveTo(0, EQUALIZER_DIMENSIONS.height / 2);
            context.lineTo(width, EQUALIZER_DIMENSIONS.height / 2);
            context.stroke();
            context.moveTo(0, height - EQUALIZER_DIMENSIONS.height / 4);
            context.lineTo(width, height - EQUALIZER_DIMENSIONS.height / 4);
            context.stroke();
        };

        const renderCurves = () => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            if (!context) return;
            const { width, height } = EQUALIZER_DIMENSIONS;

            context.clearRect(0, 0, width, height);
            context.strokeStyle = "white";
            context.lineWidth = 4;
            context.beginPath();

            context.moveTo(-100, height / 2);
            for (let i = 1; i < width; i++) {
                let y = height / 2;

                for (let point of points) {
                    const { x: pointX, y: pointY } =
                        getDimensionsFromFrequencyAndGain(
                            point.frequency,
                            point.gain
                        );

                    switch (point.type) {
                        case EqualizerType.PEAKING:
                            let dx = Math.abs(i - pointX);
                            let influence = Math.exp(
                                (-dx * dx) / (2 * point.curve * point.curve)
                            );
                            y += influence * (height - pointY - height / 2);
                            break;
                        case EqualizerType.LOW_PASS:
                            if (i <= pointX) {
                                let dx = Math.abs(i - pointX);
                                let influence = Math.exp(
                                    (-dx * dx) / (2 * point.curve * point.curve)
                                );
                                y += influence * (height - pointY - height / 2);
                            } else y = height;
                            break;
                        case EqualizerType.HIGH_PASS:
                            if (i >= pointX) {
                                let dx = Math.abs(i - pointX);
                                let influence = Math.exp(
                                    (-dx * dx) / (2 * point.curve * point.curve)
                                );
                                y += influence * (height - pointY - height / 2);
                            } else y = height;
                            break;
                    }
                }

                context.lineTo(i, y);
            }

            // Close the path to fill the area under the curve
            context.lineTo(width + 1000, height + 100); // Line to the bottom right corner
            context.lineTo(-100, height); // Line to the bottom left corner
            context.closePath();

            // Fill the area under the curve
            context.fillStyle = "rgba(219,234, 254, 0.5)";
            context.fill();

            // Draw the curve
            context.stroke();
        };

        const renderPoints = () => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            const { height } = EQUALIZER_DIMENSIONS;
            if (!context) return;
            context.lineWidth = 4;
            for (let point of points) {
                const { x, y } = getDimensionsFromFrequencyAndGain(
                    point.frequency,
                    point.gain
                );
                context.beginPath();
                context.arc(x, height - y, POINT_RADIUS, 0, 2 * Math.PI);
                context.fill();
            }
        };

        const handleMouseDown = (e: React.MouseEvent) => {
            if (!canvasRef.current) return;
            if (e.button != 0) return;
            let currentEqualizerType: EqualizerType | null = null;
            setPointTag(null);
            const currentPoint = {
                id: getNewID(),
                curve: DEFAULT_CURVE as number,
            };
            const onMouseMove = (e: MouseEvent) => {
                if (!canvasRef.current) return;

                const rect = canvasRef.current.getBoundingClientRect();
                const x = Math.max(e.pageX - rect.left, -20);
                const y = EQUALIZER_DIMENSIONS.height - (e.pageY - rect.top);
                let { frequency, gain } = getFrequencyAndGainFromDimensions(
                    x,
                    y
                );
                frequency = Math.min(
                    Math.max(frequency, MIN_FREQUENCY),
                    MAX_FREQUENCY
                );
                gain = Math.min(Math.max(gain, MIN_GAIN), MAX_GAIN);
                let type = currentEqualizerType ?? EqualizerType.PEAKING;
                const newPoint = {
                    frequency,
                    gain: type === EqualizerType.PEAKING ? gain : MIN_GAIN,
                    curve: currentPoint.curve,
                    id: currentPoint.id,
                    type,
                };
                const removeIndex = points.findIndex(
                    (point) => point.id === currentPoint.id
                );
                const newPoints = [...points];
                if (removeIndex !== -1) newPoints.splice(removeIndex, 1);
                newPoints.push(newPoint);

                setPoints(newPoints);
            };

            const onMouseUp = () => {
                if (!canvasRef.current) return;
                currentEqualizerType = null;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                canvasRef.current.removeEventListener("wheel", handleScroll);
            };

            const handleScroll = (e: WheelEvent) => {
                e.preventDefault();
                const { deltaY } = e;
                const scrollEffect = deltaY / 10;
                const newCurveValue = Math.min(
                    Math.max(currentPoint.curve - scrollEffect, 1),
                    MAX_SCROLL
                );
                currentPoint.curve = newCurveValue;
            };

            const { offsetX, offsetY } = e.nativeEvent;
            const { frequency, gain } = getFrequencyAndGainFromDimensions(
                offsetX,
                offsetY
            );
            const closestPoint = getClosestPoint(frequency, gain, points, 20);
            if (closestPoint) {
                currentPoint.id = closestPoint.id;
                currentPoint.curve = closestPoint.curve;
            }

            let type = EqualizerType.PEAKING;
            // if (frequency < 30) type = EqualizerType.HIGH_PASS;
            // if (frequency > 18000) type = EqualizerType.LOW_PASS;
            if (closestPoint) type = closestPoint.type;
            currentEqualizerType = type;
            const newPoint = {
                frequency,
                gain:
                    type === EqualizerType.PEAKING
                        ? getGainFromY(EQUALIZER_DIMENSIONS.height - offsetY)
                        : MIN_GAIN, //,
                curve: currentPoint.curve,
                id: currentPoint.id,
                type,
            };
            const removeIndex = points.findIndex(
                (point) => point.id === currentPoint.id
            );
            const newPoints = [...points];
            if (removeIndex !== -1) newPoints.splice(removeIndex, 1);
            newPoints.push(newPoint);

            setPoints(newPoints);

            canvasRef.current.addEventListener("wheel", handleScroll);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        const handleScroll = (e: React.WheelEvent) => {
            const { offsetY, offsetX } = e.nativeEvent;
            const { deltaY } = e;
            const scrollEffect = deltaY / 10;
            const { frequency, gain } = getFrequencyAndGainFromDimensions(
                offsetX,
                offsetY
            );
            const closestPoint = getClosestPoint(frequency, gain, points, 20);
            if (!closestPoint) return;
            const newCurveValue = Math.min(
                Math.max(closestPoint.curve - scrollEffect, 1),
                MAX_SCROLL
            );
            const newPoints = [...points];
            const index = newPoints.findIndex(
                (point) => point.id === closestPoint.id
            );
            if (index === -1) return;
            newPoints[index].curve = newCurveValue;
            setPoints(newPoints);
        };

        const handleRightClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const { offsetX, offsetY } = e.nativeEvent;
            const { height } = EQUALIZER_DIMENSIONS;
            const selectedPoint = points.find((point) => {
                const { x, y } = getDimensionsFromFrequencyAndGain(
                    point.frequency,
                    point.gain
                );
                return (
                    offsetX + POINT_RADIUS > x &&
                    offsetX - POINT_RADIUS < x &&
                    offsetY + POINT_RADIUS > height - y &&
                    offsetY - POINT_RADIUS < height - y
                );
            });
            const { x, y } = getDimensionsFromFrequencyAndGain(
                selectedPoint?.frequency ?? 0,
                selectedPoint?.gain ?? 0
            );
            setPointTag(
                selectedPoint
                    ? {
                          ...selectedPoint,
                          y: height - y,
                          x,
                      }
                    : null
            );
        };

        const handleClickPointTag = () => {
            if (!pointTag) return;
            setPointTag(null);
            const removeIndex = points.findIndex(
                (point) => point.id === pointTag.id
            );
            if (removeIndex !== -1) {
                const newPoints = [...points];
                newPoints.splice(removeIndex, 1);
                setPoints(newPoints);
            }
        };

        return (
            <>
                <div
                    className={twMerge(
                        "w-max h-max relative rounded-md p-4 overflow-hidden",
                        THEME_MAP[theme].dark
                    )}
                    onWheel={handleScroll}
                >
                    <div
                        className="absolute"
                        style={{
                            display: pointTag ? "block" : "none",
                            left: pointTag?.x ? pointTag.x + POINT_RADIUS : 0,
                            top: pointTag?.y ? pointTag.y - POINT_RADIUS : 0,
                        }}
                        onMouseLeave={() => setPointTag(null)}
                    >
                        <RxCross2
                            onClick={handleClickPointTag}
                            className={twMerge(
                                "w-6 h-6 rounded-full cursor-pointer",
                                THEME_MAP[theme].medium,
                                THEME_MAP[theme].medium_hover
                            )}
                            color="white"
                        />
                    </div>
                    <canvas
                        onContextMenu={handleRightClick}
                        onMouseDown={handleMouseDown}
                        ref={canvasRef}
                        width={EQUALIZER_DIMENSIONS.width}
                        height={EQUALIZER_DIMENSIONS.height}
                    ></canvas>
                </div>
            </>
        );
    }
);
