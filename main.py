from svgpathtools import svg2paths, wsvg  # you need ``pip install svgpathtools``
from svgpathtools.path import Path as CombinePath
from pathlib import Path


TEST_SVG = Path('test.svg')


def main():
    path_list, data_list = svg2paths(str(Path(TEST_SVG)))

    if not 'analysis path':
        for idx, cur_path in enumerate(path_list):
            wsvg(cur_path, filename=f'result_{idx}.svg',
                 attributes=[dict(fill="#000000", stroke="none", stroke_width=1)])

    path_list = [path_list[idx] for idx in (1, 3)]  # After analyzing the paths, we find that the paths index 1 and 3 seem to be redundant.
    single_path = CombinePath()  # combine: 0, 2 together.
    for combine_path in path_list:
        for curve in combine_path:
            single_path.append(curve)

    wsvg(single_path, filename=f'result.svg',
         attributes=[dict(fill="#000000", stroke="none", stroke_width=1)],
         openinbrowser=True  # default is False,
         )


if __name__ == '__main__':
    main()
