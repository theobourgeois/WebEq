import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import {
    BsFillPlayFill,
    BsFillPauseFill,
    BsFillRewindFill,
    BsFillVolumeDownFill,
    BsFillVolumeMuteFill,
    BsFillVolumeUpFill,
} from "react-icons/bs";
import { EqualizerTheme } from "../equalizer/Equalizer";
import RangeSlider from "./RangeSlider";

const convertSecondsToMinutes = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

interface AudioPlayerProps {
    path: string | undefined;
    title: string;
    theme: EqualizerTheme;
}

export const AudioPlayer = forwardRef(
    ({ path, title, theme }: AudioPlayerProps, ref): JSX.Element => {
        useImperativeHandle(ref, () => ({
            play: () => {
                handlePlay();
            },
            pause: () => {
                handlePause();
            },
            toggle: () => {
                handleToggle();
            },
            getAudioElement: () => {
                return audioRef.current;
            },
        }));

        const audioRef = useRef<HTMLAudioElement>(null);
        const [playing, setPlaying] = useState(false);
        const [progress, setProgress] = useState(0);
        const [showingVolumeControls, setShowingVolumeControls] =
            useState(false);
        const [volume, setVolume] = useState(1);
        const [duration, setDuration] = useState(0);
        const progressSliderRef = useRef<any>(null);

        useEffect(() => {
            if (!audioRef.current) return;
            const handleAudioPlay = () => {
                const progress = audioRef.current?.currentTime ?? 0;
                progressSliderRef.current?.seekTo(progress);
                setProgress(progress);
            };

            const handleInit = () => {
                setDuration(audioRef.current?.duration ?? 0);
                setVolume(audioRef.current?.volume ?? 1);
            };

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    handleToggle();
                }
            };

            audioRef.current.addEventListener("timeupdate", handleAudioPlay);
            audioRef.current.addEventListener("loadedmetadata", handleInit);
            document.addEventListener("keydown", handleKeyDown);

            return () => {
                audioRef.current?.removeEventListener(
                    "timeupdate",
                    handleAudioPlay
                );
                audioRef.current?.removeEventListener(
                    "loadedmetadata",
                    handleInit
                );

                document.removeEventListener("keydown", handleKeyDown);
            };
        }, []);

        const handlePlay = () => {
            audioRef.current?.play();
            setPlaying(true);
        };

        const handlePause = () => {
            setPlaying(false);
            audioRef.current?.pause();
        };

        const handleToggle = () => {
            if (audioRef.current?.paused) {
                handlePlay();
            } else {
                handlePause();
            }
        };

        const handleSeekTo = (value: number) => {
            if (!audioRef.current) return;
            audioRef.current.currentTime = value;
        };

        const handleChangeVolume = (value: number) => {
            if (!audioRef.current) return;
            audioRef.current.volume = value;
            setVolume(value);
        };

        const handleRestartTrack = () => {
            if (!audioRef.current) return;
            setProgress(0);
            audioRef.current.currentTime = 0;
            progressSliderRef.current?.seekTo(0);
        };

        const VolumeIcon = () => {
            if (volume === 0) {
                return <BsFillVolumeMuteFill className="w-8 h-8" />;
            } else if (volume < 0.5) {
                return <BsFillVolumeDownFill className="w-8 h-8" />;
            } else {
                return <BsFillVolumeUpFill className="w-8 h-8" />;
            }
        };
        if (!path) return <></>;

        return (
            <div
                className="w-full h-full"
                onMouseLeave={() => setShowingVolumeControls(false)}
            >
                <div className="flex items-center h-full w-full">
                    <div className="flex w-full">
                        <button
                            onClick={handleRestartTrack}
                            className="p-1 flex justify-center items-center rounded-md text-white"
                        >
                            <BsFillRewindFill
                                className="w-6 h-6 hover:scale-110 transform transition-all duration-300 ease-in-out"
                                color="black"
                            />
                        </button>
                        <button
                            onClick={handleToggle}
                            className="p-1 flex justify-center items-center rounded-md text-white "
                        >
                            {playing ? (
                                <BsFillPauseFill
                                    className="w-10 h-10 hover:scale-110 transform transition-all duration-300 ease-in-out"
                                    color="black"
                                />
                            ) : (
                                <BsFillPlayFill
                                    className="w-10 h-10 hover:scale-110 transform transition-all duration-300 ease-in-out"
                                    color="black"
                                />
                            )}
                        </button>
                        <div className="flex w-full items-center">
                            <p className="select-none mr-4 ml-2 w-[30px]">
                                {convertSecondsToMinutes(progress)}
                            </p>
                            <RangeSlider
                                theme={theme}
                                ref={progressSliderRef}
                                min={0}
                                max={duration}
                                value={progress}
                                step={1}
                                onChange={handleSeekTo}
                            />
                            <p className="select-none mx-4">
                                {convertSecondsToMinutes(duration)}
                            </p>
                        </div>
                        <div className="relative flex items-center">
                            <div
                                onMouseEnter={() =>
                                    setShowingVolumeControls(true)
                                }
                                className="cursor-pointer hover:scale-110 transform transition-all duration-300 ease-in-out"
                            >
                                <VolumeIcon />
                            </div>
                            <div
                                className="p-8 -left-10 -top-52 absolute"
                                onMouseLeave={() =>
                                    setShowingVolumeControls(false)
                                }
                                style={{
                                    display: showingVolumeControls
                                        ? "flex"
                                        : "none",
                                }}
                            >
                                <div className="px-6 py-6 bg-slate-200 drop-shadow-sm rounded-md h-44 w-8 ">
                                    <RangeSlider
                                        theme={theme}
                                        vertical
                                        min={0}
                                        max={1}
                                        value={volume}
                                        step={0.05}
                                        onChange={handleChangeVolume}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <audio ref={audioRef}>
                    <source src={path} />
                </audio>
            </div>
        );
    }
);
